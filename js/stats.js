$(function() {
    var fetchWait = 1500;
    var fetchMaxMinutes = 15;
    
    var BasicStats = Backbone.Model.extend({
        defaults: {
            worlds: []
        },
        
        url: function() {
            return "http://server.betterthansolo.com/stats/public/basic.txt";
        }
    });
    
    var ServerStats = Backbone.View.extend({
        tagName: "div",
        template: _.template($("#ServerTemplate").html()),
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
        },
        render: function() {
            this.$el.html(this.template(this.model.attributes));
        }
    });
    
    var WorldStats = Backbone.View.extend({
        tagName: "div",
        template: _.template($("#WorldTemplate").html()),
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
        },
        render: function() {
            this.$el.html(this.template({
                enabled: this.model.attributes.players > 2,
                name: this.options.name,
                stats: this.model.attributes.worlds[this.options.worldIndex]
            }));
        }
    });
    
    var basicStats = new BasicStats();
    
    var serverStats = new ServerStats({
        model: basicStats,
        el: $("#ServerStats").get(0)
    });
    
    _.each([ "Overworld", "Nether", "The End"], function(name, worldIndex) {
        new WorldStats({
            worldIndex: worldIndex,
            name: name,
            model: basicStats,
            el: $('<div class="span3"></div>').appendTo("#Worlds").get(0)
        });
    });
    
    var fetchCount = 0;
    var fetchMax = Math.floor(fetchMaxMinutes * 60 * 1000 / fetchWait);
    var fetch = function() {
        if (++fetchCount > fetchMax) {
            $("#TimeoutMessage").text("Stats paused. Refresh your browser to resume.").show();
            return;
        }
        
        basicStats.fetch({
            success: function() {
                setTimeout(fetch, fetchWait);
            },
            error: function() {
                setTimeout(fetch, fetchWait);
            }
        });
    };
    
    fetch();
});
