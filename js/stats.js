$(function() {
    var worldsDiv = $("div#Worlds");
    if (worldsDiv.size() == 1) {
        var worldsHtml = worldsDiv.html();
        worldsDiv.html("");
        
        var worlds = [ "Overworld", "Nether", "The End" ];
        
        for (var i = 0; i < worlds.length; i++) {
            var world = $("<div>").html(worldsHtml.replace(/id=\"world0_/g, 'id="world' + i + '_')).appendTo(worldsDiv);
            world.find("h3 span").text(worlds[i]);
        }
        
        worldsDiv.show();
        
        $.ajax({
            url: "http://server.betterthansolo.com/stats/public/basic.txt",
            cache: false,
            dataType: 'json',
            timeout: 1500,
            success: function(data, textStatus, jqXHR) {
                $("#tick").text(data.tick.average);
                $("#tickSec").text(data.tick.average);
                
                for (var i = 0; i < worlds.length; i++) {
                    $("#world" + i + "_worldTick").text(data.worlds[i].worldTick.average);
                    $("#world" + i + "_entityUpdate").text(data.worlds[i].entityUpdate.average);
                    $("#world" + i + "_tileEntityUpdate").text(data.worlds[i].tileEntityUpdate.average);
                    $("#world" + i + "_blockUpdate").text(data.worlds[i].blockUpdate.average);
                    $("#world" + i + "_worldLoadedEntities").text(data.worlds[i].worldLoadedEntities.average);
                    $("#world" + i + "_worldLoadedTileEntities").text(data.worlds[i].worldLoadedTileEntities.average);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                
            },
            complete: function(jqXHR, textStatus) {
                
            }
        });
    }
});
