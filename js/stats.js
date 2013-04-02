$(function() {
    
    // Configuration
    
    var basicStatsFetchWait = 1500;
    var lastLoginFetchWait = 5000;
    var fetchMaxMinutes = 10;
    
    // Classes
    
    var BasicStatsModel = Backbone.Model.extend({
        defaults: {
            fetchEnabled: true,
            worlds: []
        },
        
        url: function() {
            return "http://server.betterthansolo.com/stats/public/basic.txt";
        }
    });
    
    var LastLoginModel = Backbone.Model.extend({
        defaults: {
            fetchEnabled: true,
            max: 0,
            players: []
        },
        
        url: function() {
            return "http://server.betterthansolo.com/stats/lastlogin.txt";
        }
    });
    
    var LastLoginView = Backbone.View.extend({
        tagName: "div",
        template: _.template($("#LastLoginTemplate").html()),
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
        },
        render: function() {
            this.$el.html(this.template(this.model.attributes));
        }
    });
    
    var ServerView = Backbone.View.extend({
        tagName: "div",
        template: _.template($("#ServerTemplate").html()),
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
        },
        render: function() {
            this.$el.html(this.template(this.model.attributes));
        }
    });
    
    var WorldView = Backbone.View.extend({
        tagName: "div",
        template: _.template($("#WorldTemplate").html()),
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
        },
        render: function() {
            this.$el.html(this.template({
                name: this.options.name,
                stats: this.model.attributes.worlds[this.options.worldIndex]
            }));
        }
    });
    
    var MessageView = Backbone.View.extend({
        tagName: 'div',
        className: 'message',
        options: {
            container: '#Messages',
            event: 'change'
        },
        initialize: function() {
            this.listenTo(this.model, this.options.event, this.render);
        },
        render: function() {
            var message;
            if (_.isFunction(this.options.getText) && _.isString(message = this.options.getText(this.model))) {
                this.$el.text(message).appendTo(this.options.container).show();
            }
            else
                this.$el.hide();
        }
    });
    
    // Class Initialization
    
    var basicStatsModel = new BasicStatsModel();
    var lastLoginModel = new LastLoginModel();
    
    new ServerView({
        model: basicStatsModel,
        el: $("#ServerStats").get(0)
    });
    
    _.each([ "Overworld", "Nether", "The End"], function(name, worldIndex) {
        new WorldView({
            worldIndex: worldIndex,
            name: name,
            model: basicStatsModel,
            el: $('<div class="span3"></div>').appendTo("#Worlds").get(0)
        });
    });
    
    new MessageView({
        event: 'change:fetchEnabled',
        model: basicStatsModel,
        getText: function(model) {
            if (!this.model.get('fetchEnabled'))
                return "Stats paused. Refresh your browser to resume.";
        }
    });
    
    new LastLoginView({
        model: lastLoginModel,
        el: $("#LastLogin").get(0)
    });
    
    // Model Fetching
    
    var fetchModel = function(model, fetchWait, fetchMaxMinutes, endFn) {
        var fetchCount = 0;
        var fetchMax = Math.floor(fetchMaxMinutes * 60 * 1000 / fetchWait);
        var fetch = function() {
            if (++fetchCount > fetchMax) {
                endFn();
                return;
            }
        
            model.fetch({
                success: function() {
                    setTimeout(fetch, fetchWait);
                },
                error: function() {
                    setTimeout(fetch, fetchWait);
                }
            });
        };
        
        fetch();
    };
    
    fetchModel(basicStatsModel, basicStatsFetchWait, fetchMaxMinutes, function(){
        basicStatsModel.set('fetchEnabled', false);
    });
    
    fetchModel(lastLoginModel, lastLoginFetchWait, fetchMaxMinutes, function(){
        lastLoginModel.set('fetchEnabled', false);
    });
});
