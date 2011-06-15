Backbone.Model.prototype.sync = Backbone.Collection.prototype.sync = function(method, model, options) {
    var callKey = this.url() + JSON.stringify(options);
    if (cache = localStorage.getItem(callKey)) {
        var vals = JSON.parse(cache);
        return options.success(vals[0], vals[1], vals[2]);
    }

    var success = options.success;
    options.success = function(resp, status, xhr) {
        localStorage.setItem(callKey, JSON.stringify([resp, status, xhr]));
        success(resp, status, xhr);
    }

    return $.ajax(_.extend({
        type: 'GET',
        dataType: 'jsonp',
        url: this.url(),
        processData:  false
    }, options));
};

// From jed
var timeAgo = function(a,b,c){
    for (b=[1e3,60,60,24], a=new Date-a, c=0; a>2*b[c]; a/=b[c++]);
    return ~~a + '' + 'm0s0m0h0d'.split(0)[c]
};

$(function() {
  var Organization = Backbone.Model.extend({
    initialize: function(options) {
      this.repositories = options.repositories;
    },
    url: function() {
      return 'https://github.com/api/v2/json/organizations/' + this.id;
    },
    parse: function(data) {
      return data.organization;
    }
  });

  var Repository = Backbone.Model.extend({
    url: function() {
      return 'https://github.com/api/v2/json/repos/show/';
    }
  });

  var Issue = Backbone.Model.extend({
    url: function() {
      return 'http://github.com/api/v2/json/issues/list/';
    }
  });

  var Issues = Backbone.Collection.extend({
    initialize: function(options) {
      this.repository = options.repository;
      this.pivot = options.pivot || 'comments';
    },
    model: Issue,
    parse: function(data) {
      for (var i = 0; i < data.issues.length; i++) {
        data.issues[i].updated_date = Date.parse(data.issues[i].updated_at);
      }
      return data.issues;
    },
    url: function() {
      return 'http://github.com/api/v2/json/issues/list/' +
        this.repository.get('owner') + '/' + this.repository.get('name') + '/open';
    },
    comparator: function(m) {
      return -m.get(m.collection.pivot) || Infinity;
    }
  });

  var Repositories = Backbone.Collection.extend({
    url: function() {
      return 'https://github.com/api/v2/json/repos/show/' + this.organization.get('login')
    },
    initialize: function(options) {
      this.organization = options.organization;
      this.pivot = options.pivot || 'open_issues';
    },
    model: Repository,
    parse: function(data) {
      return data.repositories;
    },
    comparator: function(m) {
      return -m.get(m.collection.pivot) || Infinity;
    }
  });

  var IssueView = Backbone.View.extend({
    tagName: 'tr',
    className: 'issue-row',
    events: {
      'click a.issue-link': 'openIssue'
    },
    initialize: function() {
      _.bindAll(this, 'render', 'openIssue');
    },
    template: _.template($('#issue-template').html()),
    render: function() {
      $(this.el).html(this.template({
        title: this.model.get('title'),
        body: ($('<div>' + this.model.get('body') + '</div>').text()).replace(/\"/g, "'").substring(0, 150),
        comments: this.model.get('comments'),
        updated_at: this.model.get('updated_at'),
        html_url: this.model.get('html_url'),
        pull_request_url: this.model.get('pull_request_url')
      }));
      return this;
    },
    openIssue: function() {
    }
  });

  var IssuesView = Backbone.View.extend({
    el: $('#issues'),
    initialize: function() {
      _.bindAll(this, 'render', 'resortU', 'resortC');
    },
    events: {
      'click .comments-sort': 'resortC',
      'click .updated-sort': 'resortU'
    },
    template: _.template($('#issues-header').html()),
    render: function() {
      var v = this;
      $(this.el).html(this.template());
      this.collection.each(function(m) {
        v.$('tbody').append((new IssueView({model: m})).render().el);
      });
      return this;
    },
    resort: function(param) {
      this.collection.pivot = param;
      this.collection.sort();
      this.render();
    },
    resortC: function() { this.resort('comments'); },
    resortU: function() { this.resort('updated_date'); }
  });

  var OrgView = Backbone.View.extend({
    el: $('#repository-all'),
    initialize: function() {
      _.bindAll(this, 'render', 'viewStream');
    },
    events: {
      'click a.view-stream': 'viewStream'
    },
    template: _.template($('#repository-all-template').html()),
    render: function() {
      var v = this;
      $(this.el).empty();
      this.el.html(this.template({
        name: this.model.get('name')
      }));
      return this;
    },
    viewStream: function() {
      var all_issues = new Issues({});
      var all_issues_view = new IssuesView({ collection: all_issues });
      this.model.repositories.each(function(r) {
        (new Issues({
          repository: r
        })).fetch({
          success: function(m) {
            all_issues.add(m.models);
            all_issues_view.render();
          }
        });
      });
    }
  });

  var RepositoryView = Backbone.View.extend({
    tagName: 'tr',
    className: 'repository-row',
    events: {
      'click a.repository-link': 'openIssues'
    },
    initialize: function() {
      _.bindAll(this, 'render', 'openIssues');
    },
    template: _.template($('#repository-template').html()),
    render: function() {
      $(this.el).html(this.template({
        name: this.model.get('name'),
        has_issues: this.model.get('has_issues'),
        open_issues: this.model.get('open_issues')
      }));
      return this;
    },
    openIssues: function() {
      $('.repository-row').removeClass('selected');
      $(this.el).addClass('selected');
      var myIssues = new Issues({
        repository: this.model
      });
      myIssues.fetch({
        success: function(m) {
          (new IssuesView({ collection: m })).render();
        },
        errors: function() {
          console.log(arguments);
        }
      });
      return false;
    }
  });

  var BubView = Backbone.View.extend({
    el: $('#bub-app'),
    events: {
    },
    initialize: function(options) {
      _.bindAll(this, 'render');
      this.repositories = options.repositories;
    },
    render: function() {
      this.repositories.each(function(m) {
        if (!!m.get('has_issues') && m.get('open_issues') > 0) {
          this.$('#repositories').append(
            (new RepositoryView({ model: m })).render().el);
        }
      });
    }
  });

  $.getJSON('config.json', function(d) {
      var org = new Organization({ id: d.organization });

      org.fetch({
        success: function(model) {
          (new OrgView({ model: model })).render();
          var org_repos = new Repositories({
            organization: model
          });


          org_repos.fetch({
            success: function(model, data) {
              org.repositories = model;
              (new BubView({ repositories: model })).render();
            },
            error: function() { console.log(arguments); }
          });

        },
        error: function() { }
      });
  });
});
