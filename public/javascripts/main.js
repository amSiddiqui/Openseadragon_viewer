$(document).ready(function () {

  OpenSeadragon.setString('Tooltips.SelectionToggle', 'Selection Demo');
  OpenSeadragon.setString('Tooltips.SelectionConfirm', 'Ok');
  OpenSeadragon.setString('Tooltips.SelectionCancel', 'Cancel');
  OpenSeadragon.setString('Tooltips.ImageTools', 'Image tools');
  OpenSeadragon.setString('Tool.brightness', 'Brightness');
  OpenSeadragon.setString('Tool.contrast', 'Contrast');
  OpenSeadragon.setString('Tool.reset', 'Reset');
  OpenSeadragon.setString('Tooltips.HorizontalGuide', 'Add Horizontal Guide');
  OpenSeadragon.setString('Tooltips.VerticalGuide', 'Add Vertical Guide');
  OpenSeadragon.setString('Tool.rotate', 'Rotate');
  OpenSeadragon.setString('Tool.close', 'Close');




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
  var selection;
  var selection_enabled = false;
  var overlay_index = 0;
  var screenshot;
  var current_overlay;

  var viewer = OpenSeadragon({
    id: "openseadragon-viewer",
    prefixUrl: "/images/",
    showNavigator: true,
    animationTime: 0.5,
    blendTime: 0.1,
    constrainDuringPan: false,
    maxZoomPixelRatio: 2,
    minPixelRatio: 0.5,
    minZoomLevel: 1,
    visibilityRatio: 1,
    zoomPerScroll: 2,
    crossOriginPolicy: "Anonymous",


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


  viewer.open(image);

  viewer.scalebar({
    type: OpenSeadragon.ScalebarType.MICROSCOPY,
    pixelsPerMeter: 1000000,
    minWidth: "160px",
    location: OpenSeadragon.ScalebarLocation.BOTTOM_LEFT,
    xOffset: 40,
    yOffset: 20,
    stayInsideImage: false,
    color: "rgb(100, 100, 100)",
    fontColor: "rgb(0, 0, 0)",
    backgroundColor: "rgb(255, 255, 255, 0.8)",
    fontSize: "small",
    barThickness: 2
  });


  selection = viewer.selection({
    prefixUrl: '/images/',
    showSelectionControl: false,
    showConfirmDenyButtons: true,
    toggleButton: document.getElementById('draw-btn'),
    onSelection: onSelection,
    returnPixelCoordinates: false,
    allowRotation: false,
  });

  screenshot = viewer.screenshot({
    showOptions: true, // Default is false
    keyboardShortcut: 'p', // Default is null
    showScreenshotControl: false // Default is true
  });


  $('#draw-btn').click(function (evt) {
    if (selection_enabled) {
      selection.disable();
      $(this).removeClass('btn-active');
      $("canvas").removeClass('cursor-crosshair');
    } else {
      selection.enable();
      $(this).addClass('btn-active');
      $("canvas").addClass('cursor-crosshair');
    }
    selection_enabled = !selection_enabled;

  });

  $("#angle-select").editableSelect({
    effects: 'slide',
    filter: false
  });
  setTimeout(function () {
    $("#angle-select").val("0\u00B0");
  }, 500);

  $("#slider-angle").on("input change", function (e) {
    viewer.viewport.setRotation(e.target.value);
    $("#angle-select").val(e.target.value + "\u00B0");
  });

  $("#angle-select").on('input', function (event) {
    updateRotation(event.target.value);
  });

  $("#angle-select").on('select.editable-select', function (event) {
    updateRotation(event.target.value);
  });

  $("#zoomin-btn").click(function () {
    resetZoomButtons();
  });


  $("#zoomout-btn").click(function () {
    resetZoomButtons();
  });

  $(".btn-round-red").click(function (e) {
    resetZoomButtons();
    $(this).addClass("btn-active");
    zoomVal = parseInt($(this).val());
    viewer.viewport.zoomTo(zoomVal);
  });

  function updateRotation(val) {
    degSymbol = val.slice(-1);
    if (isNaN(degSymbol)) {
      val = val.slice(0, val.length - 1);
    }
    if (!isNaN(val)) {
      deg = parseInt(val);
      if (!isNaN(deg)) {
        if (deg < -180) {
          deg = -180;
        } else if (deg > 180) {
          deg = 180;
        }

        $("#angle-select").val(deg);
        $("#slider-angle").val(deg);
        viewer.viewport.setRotation(deg);
      }
    }
  }

  function resetZoomButtons() {
    $("#zoom-buttons").children().removeClass("btn-active");
  }

  function addOverlay(x, y, h, w, toolTipText, elementStyle) {
    var ele = document.createElement("div");
    ele.id = "overlay-" + overlay_index;
    overlay_index++;
    $(ele).css(elementStyle);
    console.log(ele);
    viewer.addOverlay({
      element: ele,
      location: new OpenSeadragon.Rect(x, y, h, w)
    });

    if (toolTipText.length != 0)
    {
      var tooltip = document.createElement("div");
      $(tooltip).append(toolTipText);
      $(tooltip).css({
        "width": "250px",
        "height": "100px",
        "padding": "10px 20px",
        "display": "none",
        "background-color": "#fff"
      });
  
  
      $("#page").append(tooltip);
  
      tooltip = $(tooltip);
  
      $(ele).hover(function (e) {
        var mouseX = e.pageX + 20,
          mouseY = e.pageY + 20,
          tipWidth = tooltip.width(),
          tipHeight = tooltip.height(),
  
          tipVisX = $(window).width() - (mouseX + tipWidth),
  
          tipVisY = $(window).height() - (mouseY + tipHeight);
  
        if (tipVisX < 20) {
          mouseX = e.pageX - tipWidth + 20;
        }
        if (tipVisY < 20) {
          mouseY = e.pageY - tipHeight - 20;
        }
  
        tooltip.css({
          top: mouseY,
          left: mouseX,
          position: 'absolute'
        });
  
        tooltip.show().css({
          opacity: 0.8
        });
      }, function () {
        tooltip.hide();
      });
    }
  }

  function closeAnnotation()
  {
    selection_enabled = false;
    selection.disable();
    $("#draw-btn").removeClass('btn-active');
    $("canvas").removeClass('cursor-crosshair');
  }
  
  function onSelection(rect) {
    $("#annotation-modal").addClass("is-active");
    closeAnnotation();
    current_overlay = rect;
  }


  $(".annotation-modal-close ").click(function () {
    $("#annotation-modal").removeClass("is-active");
    closeAnnotation();
  });

  $("#screenshot-btn").click(function () {
    screenshot.takeScreenshot();
  });


  var annotation_border_picker = Pickr.create({
    el: '#annotation-border-picker',
    theme: 'nano', // or 'monolith', or 'nano'
    default: "blue",

    swatches: [
      'rgba(244, 67, 54, 1)',
      'rgba(233, 30, 99, 0.95)',
      'rgba(156, 39, 176, 0.9)',
      'rgba(103, 58, 183, 0.85)',
      'rgba(63, 81, 181, 0.8)',
      'rgba(33, 150, 243, 0.75)',
      'rgba(3, 169, 244, 0.7)',
      'rgba(0, 188, 212, 0.7)',
      'rgba(0, 150, 136, 0.75)',
      'rgba(76, 175, 80, 0.8)',
      'rgba(139, 195, 74, 0.85)',
      'rgba(205, 220, 57, 0.9)',
      'rgba(255, 235, 59, 0.95)',
      'rgba(255, 193, 7, 1)'
    ],

    components: {

      // Main components
      preview: true,
      opacity: true,
      hue: true,

      // Input / output Options
      interaction: {
        hex: false,
        rgba: false,
        hsla: false,
        hsva: false,
        cmyk: false,
        input: false,
        clear: true,
        save: true
      }
    }
  });


  var annotation_color_picker = Pickr.create({
    el: '#annotation-background-picker',
    theme: 'nano', // or 'monolith', or 'nano'
    default: "#ffffff55",

    swatches: [
      'rgba(244, 67, 54, 1)',
      'rgba(233, 30, 99, 0.95)',
      'rgba(156, 39, 176, 0.9)',
      'rgba(103, 58, 183, 0.85)',
      'rgba(63, 81, 181, 0.8)',
      'rgba(33, 150, 243, 0.75)',
      'rgba(3, 169, 244, 0.7)',
      'rgba(0, 188, 212, 0.7)',
      'rgba(0, 150, 136, 0.75)',
      'rgba(76, 175, 80, 0.8)',
      'rgba(139, 195, 74, 0.85)',
      'rgba(205, 220, 57, 0.9)',
      'rgba(255, 235, 59, 0.95)',
      'rgba(255, 193, 7, 1)'
    ],

    components: {

      // Main components
      preview: true,
      opacity: true,
      hue: true,

      // Input / output Options
      interaction: {
        hex: false,
        rgba: false,
        hsla: false,
        hsva: false,
        cmyk: false,
        input: false,
        clear: true,
        save: true
      }
    }
  });

  $("#annotation-save-btn").click(function(){
    $("#annotation-modal").removeClass("is-active");

    var text = $("#annotation-text").val();
    var width = $("#border-width-input").val();
    var background_color = annotation_color_picker.getColor().toHEXA().toString();
    var border_color = annotation_border_picker.getColor().toHEXA().toString();
    console.log(current_overlay);
    addOverlay(current_overlay.x, current_overlay.y, current_overlay.width, current_overlay.height, text, {"border": width+"px solid "+border_color, "background-color": background_color});


  });

  $("#border-width-input").on('change', function(event) {
    var height = event.target.value;
    $("#border-example").css("height", height);
  });

  // Document keys
  $(document).keydown(function (e) {
    switch (e.keyCode) {
      case 27:
        $("#annotation-modal").removeClass("is-active");
        closeAnnotation();
        break;
    }
  });
});