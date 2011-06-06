Backbone.Model.prototype.sync = Backbone.Collection.prototype.sync = function(method, model, options) {
  return $.ajax(_.extend({
    type: 'GET',
    dataType: 'jsonp',
    url: this.url(),
    processData:  false
  }, options));
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
    },
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
      this.sortBy = options.sortBy || 'comments';
    },
    model: Issue,
    parse: function(data) {
      return data.issues;
    },
    url: function() {
      return 'http://github.com/api/v2/json/issues/list/' +
        this.repository.get('owner') + '/' + this.repository.get('name') + '/open';
    },
    comparator: function(m) {
      return -m.get(m.collection.sortBy) || Infinity;
    }
  });

  var Repositories = Backbone.Collection.extend({
    url: function() {
      return 'https://github.com/api/v2/json/repos/show/' + this.organization.get('login')
    },
    initialize: function(options) {
      this.organization = options.organization;
      this.sortBy = options.sortBy || 'open_issues';
    },
    model: Repository,
    parse: function(data) {
      return data.repositories;
    },
    comparator: function(m) {
      return -m.get(m.collection.sortBy) || Infinity;
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
        comments: this.model.get('comments'),
        html_url: this.model.get('html_url')
      }));
      return this;
    },
    openIssue: function() {
    }
  });

  var IssuesView = Backbone.View.extend({
    el: $('#issues'),
    initialize: function() {
      _.bindAll(this, 'render');
    },
    render: function() {
      var v = this;
      $(this.el).empty();
      this.collection.each(function(m) {
        $(v.el).append((new IssueView({model: m})).render().el);
      });
      return this;
    }
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
      all_issues_view.render();
      this.model.repositories.each(function(r) {
        console.log(r);
        (new Issues({
          repository: r
        })).fetch({
          success: function(m) {
            m.each(function(i) {
              all_issues.add(i);
            });
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
        this.$('#repositories').append(
          (new RepositoryView({ model: m })).render().el
        );
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
