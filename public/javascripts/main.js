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
    minZoomLevel: 1,
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
      "border": bwidth+"px solid "+borderColor,
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
    $(confirmationModal).children(".modal-content").children(".card").css({"width": "350px", "margin": "auto"});
    $(confirmationModal).attr('id', '');
    $("#page").append(confirmationModal);

    $(deleteButton).click(function () {  
      $(confirmationModal).addClass('is-active');
    });

    $(confirmationModal).children('button').click(function() {
      $(confirmationModal).removeClass('is-active');
    });

    $(confirmationModal).children().find("#cancel-button").click(function() {
      $(confirmationModal).removeClass('is-active');
    });

    $(confirmationModal).children().find("#delete-button").click(function() {
      $(confirmationModal).removeClass('is-active');
      $(confirmationModal).remove();
      $(tooltip).remove();
      viewer.removeOverlay(ele);
    });

    $(editButton).click(function() {
      $("#annotation-modal-title").html("Edit Annotation");
      $("#annotation-modal").addClass("is-active");
      editMode = true;
      console.log(overlays);
      console.log(overlay_index-1);
      $("#annotation-text").val(overlays[overlay_index-1].text);
      annotation_border_picker.setColor(overlays[overlay_index-1].border);
      annotation_color_picker.setColor(overlays[overlay_index-1].backgound);
      $("#border-width-input").val(overlays[overlay_index-1].width);
      currentEditingOverlay = {id: overlay_index-1, overlay: ele, tooltip: tooltip};
    });

    overlays.push({overlay: ele, text: toolTipText, width: bwidth, border: borderColor, backgound: backgroundColor});

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

    return {card: card, delete: deleteButton, edit: editButton};
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
      "border": width+"px solid "+border_color
    });
    if (text.length == 0 && overlays[currentEditingOverlay.id].text.length != 0) {
      currentEditingOverlay.tooltip.find(".card-content").remove();
    }
    else if (text.length != 0 && overlays[currentEditingOverlay.id].text.length == 0) {
      var cardContent = document.createElement('div');
      $(cardContent).addClass('card-content');
      var paragraph = document.createElement('p');
      $(paragraph).append(text);
      $(cardContent).append(paragraph);
      $(currentEditingOverlay.tooltip).append(cardContent);
    }
    else if (text.length != 0 && overlays[currentEditingOverlay.id].text.length != 0) {
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
    }else{
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
});