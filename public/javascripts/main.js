$(document).ready(function () {

  // Tooltip Variable Settings
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

  // Image Initialization
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

  // Variable declarations
  var viewer_is_new;
  var bm_center;
  var bm_zoom;
  var bm_goto;
  var selection;
  var selection_enabled = false; // Stores wheather the user is in the annotation selection mode
  var overlay_index = 0; // Stores the current overlay index
  var current_overlay; // Stores the Rect of the current overlay that is drawn
  var overlays = []; // Stores all the overlays created
  var rotation_enabled = false; // Stores whether the rotation slider is visible
  var rotator; // Stores the Rotation slider data
  var annotation_border_picker; // Stores the Overlay Border color data
  var default_border_color = "red";
  var annotation_color_picker; // Stores the Overlay Background color data
  var default_background_color = "#ffffff00";
  var annotation_closed = false; // Stores whether the annotation was closed or not
  var recal_card_pos = true;
  var editMode = false;
  var currentEditingOverlay = null;
  var paperOverlay;


  // Initialization of Openseadragon viewer
  var viewer = OpenSeadragon({
    id: "openseadragon-viewer",
    prefixUrl: "/images/",
    showNavigator: true,
    animationTime: 0.5,
    blendTime: 0.1,
    constrainDuringPan: false,
    maxZoomPixelRatio: 2,
    minPixelRatio: 0.5,
    minZoomLevel: 0.65,
    visibilityRatio: 1,
    zoomPerScroll: 2,
    crossOriginPolicy: "Anonymous",

    zoomInButton: "zoomin-btn",
    zoomOutButton: "zoomout-btn",
    homeButton: "home-btn",
  });

  viewer.open(image);

  // Viewer Event handlers

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
    rotator.setValue(0);
    updateRotation(0);
    resetZoomButtons();
  });


  viewer.addHandler("zoom", function (event) {
    var z = event.zoom;
    var scaling = 20.0 / z;
    scaling = Math.max(2, scaling);
    scaling = Math.min(20, scaling);

    var offset = 150.0 / z;
    offset = Math.min(150.0, offset);
    offset = Math.max(30.0, offset);
    lines.forEach(function (line) {
      line.text.scaling = new Point(scaling, scaling);
      var mid = midPoint(line.line.firstSegment.point, line.line.lastSegment.point);
      var off = new Point(offset * line.offset.x, offset * line.offset.y);
      line.text.position = mid.add(off);
    });

    rects.forEach(function(rect) {
      rect.lText.scaling = new Point(scaling, scaling);
      var mid = midPoint(rect.rect.bounds.topLeft, rect.rect.bounds.topRight);
      var off = new Point(offset * rect.lOff.x, offset * rect.lOff.y);
      rect.lText.position = mid.add(off);


      rect.bText.scaling = new Point(scaling, scaling);
      mid = midPoint(rect.rect.bounds.topRight, rect.rect.bounds.bottomRight);
      off = new Point(offset * rect.bOff.x, offset * rect.bOff.y);
      rect.bText.position = mid.add(off);
    });

    circles.forEach(function(circle) {
      var maxScale = Math.min(20.0, circle.circle.radius / 50.0);
      scaling = Math.min(maxScale, scaling);
      scaling = Math.max(1, scaling);
      circle.scale.text.scaling = new Point(scaling, scaling);
      var mid = midPoint(circle.scale.line.firstSegment.point, circle.scale.line.lastSegment.point);
      var off = new Point(offset * circle.scale.offset.x, offset * circle.scale.offset.y);
      circle.scale.text.position = mid.add(off);
    });

  });

  // Openseadragon Plugin initialization

  // Scalebar plugin
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

  // Selection plugin
  selection = viewer.selection({
    prefixUrl: '/images/',
    showSelectionControl: false,
    showConfirmDenyButtons: true,
    toggleButton: document.getElementById('draw-btn'),
    onSelection: onSelection,
    returnPixelCoordinates: false,
    allowRotation: false,
  });

  // Paperjs overlay
  paperOverlay = viewer.paperjsOverlay();

  // Other tool Initialization

  // Rotation slider
  $("#rotation-selector").roundSlider({
    radius: 60,
    sliderType: "min-range",
    value: 50,
    svgMode: true,
    tooltipFormat: tooltipInDegrees,
    change: updateRotationSlider,
    drag: updateRotationSlider,
    min: 0,
    max: 360
  });

  // Event Handlers for Rotation Slider
  function tooltipInDegrees(args) {
    return args.value + "\u00B0";
  }

  function updateRotationSlider(e) {
    updateRotation(e.value);
  }

  rotator = $("#rotation-selector").data("roundSlider");

  // Fix tooltip not in center
  setTimeout(function () {
    $(".rs-tooltip").css({
      "margin-top": "-15.5px",
      "margin-left": "-16.652px"
    });
  }, 1000);

  // Color picker initialization
  // Overlay Border
  annotation_border_picker = Pickr.create({
    el: '#annotation-border-picker',
    theme: 'nano', // or 'monolith', or 'nano'
    default: default_border_color,

    swatches: [
      'red',
      'yellow',
      'green',
      'black',
      'orange',
      'purple',
      'gray'
    ],

    components: {

      // Main components
      preview: true,
      opacity: false,
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

  // Overlay Background
  annotation_color_picker = Pickr.create({
    el: '#annotation-background-picker',
    theme: 'nano', // or 'monolith', or 'nano'
    default: default_background_color,

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

  // Color picker events
  annotation_color_picker.on('save', function (event) {
    annotation_color_picker.hide();
  });

  annotation_border_picker.on('save', function (event) {
    annotation_border_picker.hide();
  });


  // Helper Functions
  function updateRotation(deg) {
    viewer.viewport.setRotation(deg);
  }

  function resetZoomButtons() {
    $("#zoom-buttons").children().removeClass("btn-active");
  }

  function addOverlay(x, y, h, w, toolTipText, bwidth, borderColor, backgroundColor) {
    var ele = document.createElement("div");
    ele.id = "overlay-" + overlay_index;
    overlay_index++;
    $(ele).css({
      "border": bwidth + "px solid " + borderColor,
      "background-color": backgroundColor
    });
    viewer.addOverlay({
      element: ele,
      location: new OpenSeadragon.Rect(x, y, h, w)
    });


    // Add Tooltip with text
    var tooltip = createCard(toolTipText, ele);
    var deleteButton = tooltip.delete;

    var editButton = tooltip.edit;
    var confirmationModal = $("#delete-confirm").clone();
    $(confirmationModal).children(".modal-content").children(".card").css({
      "width": "350px",
      "margin": "auto"
    });
    $(confirmationModal).attr('id', '');
    $("#page").append(confirmationModal);

    $(deleteButton).click(function () {
      $(confirmationModal).addClass('is-active');
    });

    $(confirmationModal).children('button').click(function () {
      $(confirmationModal).removeClass('is-active');
    });

    $(confirmationModal).children().find("#cancel-button").click(function () {
      $(confirmationModal).removeClass('is-active');
    });

    $(confirmationModal).children().find("#delete-button").click(function () {
      $(confirmationModal).removeClass('is-active');
      $(confirmationModal).remove();
      $(tooltip).remove();
      viewer.removeOverlay(ele);
    });

    $(editButton).click(function () {
      $("#annotation-modal-title").html("Edit Annotation");
      $("#annotation-modal").addClass("is-active");
      editMode = true;
      $("#annotation-text").val(overlays[overlay_index - 1].text);
      annotation_border_picker.setColor(overlays[overlay_index - 1].border);
      annotation_color_picker.setColor(overlays[overlay_index - 1].backgound);
      $("#border-width-input").val(overlays[overlay_index - 1].width);
      currentEditingOverlay = {
        id: overlay_index - 1,
        overlay: ele,
        tooltip: tooltip
      };
    });

    overlays.push({
      overlay: ele,
      text: toolTipText,
      width: bwidth,
      border: borderColor,
      backgound: backgroundColor
    });

    $("#page").append(tooltip.card);
    tooltip = $(tooltip.card);

    $(ele).hover(function (e) {
      if (recal_card_pos) {
        var mouseX = e.pageX,
          mouseY = e.pageY,
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
      }
      if (!annotation_closed) {
        tooltip.show();
        recal_card_pos = false;
      }
    }, function () {
      if (!tooltip.is(":hover")) {
        tooltip.hide();
        recal_card_pos = true;
      }
      annotation_closed = false;
    });

  }

  function createCard(message, overlay) {
    var card = document.createElement('div');
    $(card).addClass('card');
    var closeButton = document.createElement('a');
    $(closeButton).addClass('delete');
    $(closeButton).addClass('card-close');
    $(card).append(closeButton);

    var width = message.length == 0 ? "200px" : "300px";
    $(card).css("width", width);
    if (message.length != 0) {
      var cardContent = document.createElement('div');
      $(cardContent).addClass('card-content');
      var paragraph = document.createElement('p');
      $(paragraph).append(message);
      $(cardContent).append(paragraph);
      $(card).append(cardContent);
    }
    var footer = document.createElement('footer');
    $(footer).addClass('card-footer');

    var cardItem = document.createElement('p');
    $(cardItem).addClass('card-footer-item');
    var span = document.createElement('span');
    var editButton = document.createElement('button');
    $(editButton).append('Edit');
    $(editButton).addClass('button');
    $(editButton).addClass('is-info');
    $(editButton).addClass('is-small');
    $(span).append(editButton);
    $(cardItem).append(span);
    $(footer).append(cardItem);

    var cardItem2 = document.createElement('p');
    $(cardItem2).addClass('card-footer-item');
    var span2 = document.createElement('span');
    var deleteButton = document.createElement('button');
    $(deleteButton).append('Delete');
    $(deleteButton).addClass('button');
    $(deleteButton).addClass('is-danger');
    $(deleteButton).addClass('is-small');
    $(span2).append(deleteButton);
    $(cardItem2).append(span2);
    $(footer).append(cardItem2);

    $(card).append(footer);

    $(closeButton).click(function () {
      $(card).hide();
      annotation_closed = true;
    });


    $(card).hover(function () {}, function () {
      if (!$(overlay).is(":hover")) {
        $(card).hide();
        recal_card_pos = true;
      }
    });

    return {
      card: card,
      delete: deleteButton,
      edit: editButton
    };
  }

  function closeAnnotation() {
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

  function resetAnnotationModal() {
    $("#annotation-text").val('');
    $("#border-width-input").val(4);
    annotation_border_picker.setColor(default_border_color);
    annotation_color_picker.setColor(default_background_color);
    $("#annotation-modal-title").html("Add Annotation");
  }

  function updateAnnotation(text, width, background_color, border_color) {
    $(currentEditingOverlay.overlay).css({
      "background-color": background_color,
      "border": width + "px solid " + border_color
    });
    if (text.length == 0 && overlays[currentEditingOverlay.id].text.length != 0) {
      currentEditingOverlay.tooltip.find(".card-content").remove();
    } else if (text.length != 0 && overlays[currentEditingOverlay.id].text.length == 0) {
      var cardContent = document.createElement('div');
      $(cardContent).addClass('card-content');
      var paragraph = document.createElement('p');
      $(paragraph).append(text);
      $(cardContent).append(paragraph);
      $(currentEditingOverlay.tooltip).append(cardContent);
    } else if (text.length != 0 && overlays[currentEditingOverlay.id].text.length != 0) {
      $(currentEditingOverlay.tooltip).find(".card-content").children('p').html(text);
    }

  }

  // Event Handlers

  // Toolbar Buttons
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

  $("#zoomin-btn").click(function () {
    resetZoomButtons();
  });

  $("#zoomout-btn").click(function () {
    resetZoomButtons();
  });

  // Zoom Preset Buttons
  $(".btn-round-red").click(function (e) {
    resetZoomButtons();
    $(this).addClass("btn-active");
    zoomVal = parseInt($(this).val());
    viewer.viewport.zoomTo(zoomVal);
  });

  $("#screenshot-btn").click(function () {
    $("#loading-modal").addClass("is-active");
    var parent = $('.openseadragon-container').get(0);
    var toBeHidden = $(parent).children().get(2);
    $(toBeHidden).hide();
    html2canvas($("#openseadragon-viewer").get(0)).then(function (canvas) {
      Canvas2Image.saveAsPNG(canvas);
      $("#loading-modal").removeClass("is-active");
      $(toBeHidden).show();
    });
  });


  $("#rotation-btn").click(function (event) {
    if (rotation_enabled) {
      $("#rotation-menu").removeClass("is-active");
    } else {
      $("#rotation-menu").addClass("is-active");
    }
    rotation_enabled = !rotation_enabled;
  });

  $("#btn-rotate-preset-1").click(function () {
    rotator.setValue(0);
    updateRotation(0);
  });

  $("#btn-rotate-preset-2").click(function () {
    rotator.setValue(90);
    updateRotation(90);
  });

  $("#btn-rotate-preset-3").click(function () {
    rotator.setValue(180);
    updateRotation(180);
  });

  // Modal Control Events (Modal for annotation input)

  $(".annotation-modal-close ").click(function () {
    $("#annotation-modal").removeClass("is-active");
    editMode = false;
    resetAnnotationModal();
    closeAnnotation();
  });

  $("#annotation-save-btn").click(function () {
    $("#annotation-modal").removeClass("is-active");
    var text = $("#annotation-text").val();
    var width = $("#border-width-input").val();
    var background_color = annotation_color_picker.getColor().toHEXA().toString();
    var border_color = annotation_border_picker.getColor().toHEXA().toString();
    if (editMode) {
      updateAnnotation(text, width, background_color, border_color);
    } else {
      addOverlay(current_overlay.x, current_overlay.y, current_overlay.width, current_overlay.height, text, width, border_color, background_color);
    }
    editMode = false;
    resetAnnotationModal();
  });

  $("#border-width-input").on('change', function (event) {
    var height = event.target.value;
    $("#border-example").css("height", height);
  });


  // Document key events
  $(document).keydown(function (e) {
    switch (e.keyCode) {
      case 27:
        $("#annotation-modal").removeClass("is-active");
        closeAnnotation();
        break;
    }
  });

  // Document Click Events
  $(document).click(function (event) {
    var id = event.target.id;
    if ($(event.target).closest("#rotation-btn").length == 0 && $(event.target).closest("#rotation-menu").length == 0) {
      $("#rotation-menu").removeClass("is-active");
      rotation_enabled = false;
    }
  });

  // Resize event
  window.onresize = function () {
    paperOverlay.resize();
    paperOverlay.canvasresize();
  };


  // Paperjs Drawing tool
  // Install paperjs
  paper.install(window);

  /*
  0 - Drawing Mode off
  1 - Pen Mode
  2 - Rect Mode
  3 - Circle Mode
  */
  var drawMode = 0;
  var startPoint = null;
  var currentLine = null;
  var lines = [];

  var currentRect = null;
  var rects = [];

  var currentCircle = null;
  var circles = [];


  $("#pen-btn").click(function () {
    if (drawMode !== 1) {
      drawMode = 1;
      viewer.setMouseNavEnabled(false);
    } else {
      drawMode = 0;
      viewer.setMouseNavEnabled(true);
    }
  });

  $("#rect-btn").click(function () {
    if (drawMode !== 2) {
      drawMode = 2;
      viewer.setMouseNavEnabled(false);
    } else {
      drawMode = 0;
      viewer.setMouseNavEnabled(true);
    }
  });

  $("#circle-btn").click(function () {
    if (drawMode !== 3) {
      drawMode = 3;
      viewer.setMouseNavEnabled(false);
    } else {
      drawMode = 0;
      viewer.setMouseNavEnabled(true);
    }
  });

  // Openseadragon Mouse events
  var mouseTracker = new OpenSeadragon.MouseTracker({
    element: viewer.canvas,
    pressHandler: pressHandler,
    dragHandler: dragHandler,
    dragEndHandler: dragEndHandler
  });
  mouseTracker.setTracking(true);


  function pressHandler(event) {
    var transformedPoint = view.viewToProject(new Point(event.position.x, event.position.y));
    startPoint = transformedPoint;
    switch (drawMode) {
      case 1:
        linePressHandler();
        break;

      case 2:
        rectPressHandler();
        break;

      case 3:
        circlePressHandler();
        break;
    }

  }

  function dragHandler(event) {
    var tPoint = view.viewToProject(new Point(event.position.x, event.position.y));
    switch (drawMode) {
      case 1:
        lineDragHandler(tPoint);
        break;

      case 2:
        rectDragHandler(tPoint);
        break;

      case 3:
        circleDragHandler(tPoint);
        break;
    }
  }

  function dragEndHandler(event) {
    var tPoint = view.viewToProject(new Point(event.position.x, event.position.y));
    switch (drawMode) {
      case 1:
        lineDragEndHandler(tPoint);
        break;

      case 2:
        rectDragEndHandler(tPoint);
        break;

      case 3:
        circleDragEndHandler(tPoint);
        break;
    }

    startPoint = null;
  }


  // Helper function
  function linePressHandler() {
    currentLine = {
      line: new Path(),
      text: null,
      offset: null
    };
    currentLine.line.strokeColor = 'red';
    currentLine.line.strokeCap = 'round';
    currentLine.line.strokeWidth = 30;
    currentLine.line.add(startPoint);
  }

  function lineDragHandler(current) {
    var firstSeg = currentLine.line.firstSegment;
    if (currentLine.text === null) {
      var newText = createText(firstSeg.point, current, 2, 20);
      currentLine.text = newText.text;
      currentLine.offset = newText.offset;
    }
    currentLine.text.remove();
    var nText = createText(firstSeg.point, current, 2, 20);
    currentLine.text = nText.text;
    currentLine.offset = nText.offset;
    currentLine.line.removeSegments();
    currentLine.line.add(firstSeg, current);
  }

  function lineDragEndHandler(current) {
    lines.push(currentLine);
    currentLine = null;
  }

  function circlePressHandler() {
    currentCircle = {
      circle: null,
      scale: {
        line: new Path(),
        text: null,
        offset: null
      }
    };
    currentCircle.scale.line.strokeColor = '#222';
    currentCircle.scale.line.strokeCap = 'round';
    currentCircle.scale.line.strokeWidth = 30;
    currentCircle.scale.line.dashArray = [70, 70];
    currentCircle.scale.line.add(startPoint);

  }

  function circleDragHandler(current) {
    if (currentCircle.circle === null) {
      currentCircle.circle = createCircle(startPoint, startPoint.getDistance(current));
    }
    currentCircle.circle.remove();
    currentCircle.circle = createCircle(startPoint, startPoint.getDistance(current));

    var firstSeg = currentCircle.scale.line.firstSegment;
    currentCircle.scale.line.removeSegments();
    currentCircle.scale.line.add(firstSeg, current);
    var radius = currentCircle.circle.radius;
    var maxScale = Math.min(20.0, radius / 50.0);
    if (currentCircle.scale.text === null) {
      var newText = createText(firstSeg.point, current, 1, maxScale);
      currentCircle.scale.text = newText.text;
      currentCircle.scale.offset = newText.offset;
    }
    currentCircle.scale.text.remove();
    var nText = createText(firstSeg.point, current, 1, maxScale);
    currentCircle.scale.text = nText.text;
    currentCircle.scale.offset = nText.offset;

    var dashWidth = radius / 10.0;
    dashWidth = Math.max(5, dashWidth);
    dashWidth = Math.min(30, dashWidth);

    var dashLen = radius / 7.0;
    dashLen = Math.max(10, dashLen);
    dashLen = Math.min(70, dashLen);
    currentCircle.scale.line.strokeWidth = dashWidth;
    currentCircle.scale.line.dashArray = [dashLen, dashLen];

  }

  function circleDragEndHandler(current) {
    if (currentCircle !== null) {
      var c = createCircle(currentCircle.circle.position, currentCircle.circle.radius);
      var s = {
        line: currentCircle.scale.line.clone(),
        text: currentCircle.scale.text.clone(),
        offset: currentCircle.scale.offset.clone()
      };
      circles.push({
        circle: c,
        scale: s
      });
      s.line.visible = false;
      s.text.visible = false;
      c.onMouseEnter = function() {
        s.line.visible = true;
        s.text.visible = true;    
      };
      
      c.onMouseLeave = function() {
        s.line.visible = false;
        s.text.visible = false;    
      };

      currentCircle.circle.remove();
      currentCircle.scale.line.remove();
      currentCircle.scale.text.remove();
    }
  }

  function rectPressHandler() {
    currentRect = {
      rect: null,
      lText: null,
      lOff: null,
      bText: null,
      bOff: null
    };
  }

  function rectDragHandler(current) {
    if (currentRect.rect === null) {
      currentRect.rect = createRect(startPoint, current);
    }
    currentRect.rect.remove();
    currentRect.rect = createRect(startPoint, current);
    
    if (currentRect.lText === null) {
      var newText = createText(currentRect.rect.bounds.topLeft, currentRect.rect.bounds.topRight, 2, 20);
      currentRect.lText = newText.text;
      currentRect.lOff = newText.offset;
    }
    currentRect.lText.remove();
    var nText = createText(currentRect.rect.bounds.topLeft, currentRect.rect.bounds.topRight, 2, 20);
    currentRect.lText = nText.text;
    currentRect.lOff = nText.offset;
    
    if (currentRect.bText === null) {
      var newRText = createText(currentRect.rect.bounds.topRight, currentRect.rect.bounds.bottomRight, 2, 20);
      currentRect.bText = newRText.text;
      currentRect.bOff = newRText.offset;
    }
    currentRect.bText.remove();
    var nRText = createText(currentRect.rect.bounds.topRight, currentRect.rect.bounds.bottomRight, 2, 20);
    currentRect.bText = nRText.text;
    currentRect.bOff = nRText.offset;

  }

  function rectDragEndHandler(current) {
    if (currentRect.rect !== null) {
      var finalRect = createRect(startPoint, current);
      var obj = {
        rect: finalRect,
        lText: currentRect.lText.clone(),
        lOff: currentRect.lOff,
        bText: currentRect.bText.clone(),
        bOff: currentRect.bOff
      };
      rects.push(obj);
      obj.lText.visible = false;
      obj.bText.visible = false;
      finalRect.onMouseEnter = function () {
        obj.lText.visible = true;
        obj.bText.visible = true;
      };

      finalRect.onMouseLeave = function () {
        obj.lText.visible = false;
        obj.bText.visible = false;
      };

      currentRect.rect.remove();
      currentRect.lText.remove();
      currentRect.bText.remove();
    }
  }


  function createCircle(center, radius) {
    var c = new Shape.Circle(center, radius);
    c.strokeColor = 'red';
    c.fillColor = 'rgba(255, 255, 255, 0.05)';
    c.strokeWidth = 30;
    return c;
  }

  function createRect(from, to) {
    var c = new Shape.Rectangle(from, to);
    c.strokeColor = 'red';
    c.fillColor = 'rgba(255, 255, 255, 0.05)';
    c.strokeWidth = 30;
    return c;
  }

  function createText(start, end, sl, su) {
    var yOff = -1;
    var xOff = 1;
    var z = viewer.viewport.getZoom();
    var rot = angleFromHorizontal(start, end);
    // If in first or third quadrand
    if ((end.x > start.x && end.y < start.y) || (end.x < start.x && end.y > start.y)) {
      rot = rot * -1;
      xOff = xOff * -1;
    }

    var offset = 100.0 / z;
    offset = Math.min(100.0, offset);
    offset = Math.max(20.0, offset);
    var off = new Point(offset * xOff, offset * yOff);

    var text = new PointText(midPoint(start, end).add(off));
    text.justification = 'center';
    text.fillColor = 'black';
    text.rotation = rot;
    text.fontFamily = 'sans serif';

    var scaling = 20.0 / z;
    scaling = Math.max(sl, scaling);
    scaling = Math.min(su, scaling);
    text.scaling = new Point(scaling, scaling);
    text.fontWeight = 600;

    text.content = start.getDistance(end).toFixed(2);
    return {
      text: text,
      offset: new Point(xOff, yOff),
    };

  }

  function midPoint(a, b) {
    return new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
  }

  function angleFromHorizontal(a, b) {
    var max = Point.max(a, b);
    var min = Point.min(a, b);
    var vec = max.subtract(min);

    return vec.getAngle(new Point(1, 0));
  }
});