$(document).ready(function () {

  var image = {
    Image: {
      xmlns: "http://schemas.microsoft.com/deepzoom/2008",
      Url: "//openseadragon.github.io/example-images/duomo/duomo_files/",
      Format: "jpg",
      Overlap: "2",
      TileSize: "256",
      Size: {
        Width: "13920",
        Height: "10200"
      }
    }
  };

  var viewer_is_new;
  var bm_center;
  var bm_zoom;
  var bm_goto;
  var annotations;

  var viewer = OpenSeadragon({
    id: "seadragon-viewer",
    prefixUrl: "//openseadragon.github.io/openseadragon/images/",
    showNavigator: true,
    animationTime: 0.5,
    blendTime: 0.1,
    constrainDuringPan: false,
    maxZoomPixelRatio: 2,
    minPixelRatio: 0.5,
    minZoomLevel: 1,
    visibilityRatio: 1,
    zoomPerScroll: 2,


    zoomInButton: "zoomin-btn",
    zoomOutButton: "zoomout-btn",
    homeButton: "home-btn",
  });

  
  viewer.addHandler("open", function () {
    viewer.source.minLevel = 8;
    /* Start zoomed in, then return to home position after
    loading.  Workaround for blurry viewport on initial
    load (OpenSeadragon #95). */
    var center = new OpenSeadragon.Point(0.5,
      1 / (2 * viewer.source.aspectRatio));
      viewer.viewport.zoomTo(2, center, true);
      viewer_is_new = true;
      /* Ensure we receive update-viewport events, OpenSeadragon
      #94 */
      viewer.drawer.viewer = viewer;
    });

    viewer.addHandler("update-viewport", function () {
      if (viewer_is_new) {
        setTimeout(function () {
          if (viewer.viewport) {
            viewer.viewport.goHome(false);
          }
        }, 5);
        viewer_is_new = false;
      }
    });

    viewer.addHandler("home", function () {
    if (bm_goto) {
      setTimeout(function () {
        if (viewer.viewport) {
          viewer.viewport.zoomTo(bm_zoom, bm_center, false);
        }
      }, 200);
      bm_goto = false;
    }
    updateRotation('0');
    resetZoomButtons();
  });
  
  viewer.scalebar({
    type: OpenSeadragon.ScalebarType.MICROSCOPY,
    pixelsPerMeter: 1000000,
    minWidth: "160px",
    location: OpenSeadragon.ScalebarLocation.BOTTOM_LEFT,
    xOffset: 5,
    yOffset: 10,
    stayInsideImage: true,
    color: "rgb(150, 150, 150)",
    fontColor: "rgb(100, 100, 100)",
    backgroundColor: "rgb(255, 255, 255)",
    fontSize: "small",
    barThickness: 2
  });
  
  viewer.open(image);
  
  $("#angle-select").editableSelect({ effects: 'slide', filter: false });
  
  $("#slider-angle").on("input change", function(e) {
    viewer.viewport.setRotation(e.target.value);
    $("#angle-select").val(e.target.value+"\u00B0");
  });
  
  $("#angle-select").on('input', function(event) {
    updateRotation(event.target.value);
  });
  
  $("#angle-select").on('select.editable-select', function(event) {
    console.log(event);
    updateRotation(event.target.value);
  });
  
  $("#zoomin-btn").click(function() {
    resetZoomButtons();
  });
  
  
  $("#zoomout-btn").click(function() {
    resetZoomButtons();
  });
  
  $(".btn-round-red").click(function(e) {
    resetZoomButtons();
    $(this).addClass("btn-active");
    zoomVal = parseInt($(this).val());
    viewer.viewport.zoomTo(zoomVal);
  });
  
  function updateRotation(val) {
    degSymbol = val.slice(-1);
    if (isNaN(degSymbol))
    {
      val = val.slice(0, val.length - 1);
    }
    if (!isNaN(val)) {
      deg = parseInt(val);
      if (!isNaN(deg)) 
      {
        if (deg < -180)
        {
          deg = -180;
        }
        else if (deg > 180)
        {
          deg = 180;
        }

        $("#angle-select").val(deg);
        $("#slider-angle").val(deg);
        viewer.viewport.setRotation(deg);
      }
    }
  }
  
  function resetZoomButtons()
  {
    $("#zoom-buttons").children().removeClass("btn-active");
  }

  // anno.makeAnnotable(viewer);
  
});