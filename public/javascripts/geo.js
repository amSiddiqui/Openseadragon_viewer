// the global image size and tiling

$(document).ready(function() {
    var height = 9221;
    var width = 7026;
    var tsize = 256;
    
    // initialize the openseadragon viewer
    var osd = OpenSeadragon({
        id: 'osd',
        prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
        tileSources: ['https://openseadragon.github.io/example-images/highsmith/highsmith.dzi']
    });
    
    // initialize the geojs viewer
    var params = geo.util.pixelCoordinateParams('#geojs', width, height, tsize, tsize);
    params.map.clampZoom = false;
    params.map.clampBoundsX = false;
    params.map.clampBoundsY = false;
    var map = geo.map(params.map);
    var layer = map.createLayer('annotation');
    
    // turn off geojs map navigation
    map.interactor().options({actions: []});
    
    // get the current bounds from the osd viewer
    function getBounds() {
        return osd.viewport.viewportToImageRectangle(osd.viewport.getBounds(true));
    }
    
    // set the geojs bounds from the osd bounds
    function setBounds() {
        var bounds = getBounds();
        map.bounds({
            left: bounds.x,
            right: bounds.x + bounds.width,
            top: bounds.y,
            bottom: bounds.y + bounds.height
        });
    }
    
    // add handlers to tie navigation events together
    osd.addHandler('open', setBounds);
    osd.addHandler('animation', setBounds);
    
    // add a handler for when an annotation is created
    function created(evt) {
        $('#geojs .geojs-layer').css('pointer-events', 'none');
        
        // write out the annotation definition
        console.log(evt.annotation.features()[0]);
    }
    map.geoOn(geo.event.annotation.state, created);
    
    // add handlers for drawing annotations
    function draw(evt) {
        $('#geojs .geojs-layer').css('pointer-events', 'auto');
        var type = $(evt.target).data('type');
        layer.mode(type);
    }
    $('.controls-container button').click(draw);
});
