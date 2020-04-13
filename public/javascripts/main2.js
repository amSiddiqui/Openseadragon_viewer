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

  // Set viewer height
  var navbarHeight = $(".navbar").height();
  var pageHeight = $("#page").height();
  $("#openseadragon-viewer").height(pageHeight - navbarHeight);

  // Image Initialization
  var image1 = {
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

  var image2 = "/slides/CMU-1-Small-Region.dzi";

  var image = image2;

  paper.install(window);



  // Variable declarations
  var ppm = 1000000;
  var viewer_is_new;
  var bm_center;
  var bm_zoom;
  var bm_goto;
  var rotator; // Stores the Rotation slider data
  var annotation_border_picker; // Stores the Overlay Border color data
  var default_border_color = "red";
  var annotation_font_picker; // Stores the Overlay Background color data
  var default_font_color = "black";
  var annotation_closed = false; // Stores whether the annotation was closed or not
  var editMode = false;
  var currentEditingOverlay = null;
  var paperOverlay;
  var viewerOpen = false;
  var font_color = default_font_color;
  var stroke_color = default_border_color;
  var stroke_width = 4;
  var selectingColor = false;
  var prevZoom;
  var viewZoom;



  /*
  0 - Drawing Mode off
  1 - Line Mode
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
  var lastOverlay;

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
      //   minZoomLevel: 0.653,
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

      setTimeout(function () {
          $("#home-btn").addClass("is-info");
          viewer.viewport.minZoomLevel = viewer.viewport.getHomeZoom();
          viewerOpen = true;
          stroke_width = stroke_width / paper.view.zoom;
          viewZoom = paper.view.zoom;
          prevZoom = viewer.viewport.getHomeZoom();
      }, 500);

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

      if (!viewerOpen) return;
      var z = event.zoom;
      var homeZoom = viewer.viewport.getHomeZoom();
      if (z.toFixed(2) == homeZoom.toFixed(2) && viewer.viewport.getRotation() == 0) {
          $("#home-btn").addClass("is-info");
          $("#btn-rotate-preset-1").removeClass("is-info");
      } else {
          $("#home-btn").removeClass("is-info");
      }

      $(".zoom-button").get().forEach(function (btn) {
          switch (parseInt(btn.value)) {
              case 2:
                  if (z == 2) {
                      $(btn).addClass("orange-button");
                  } else {
                      $(btn).removeClass("orange-button");
                  }
                  break;

              case 5:
                  if (z == 5) {
                      $(btn).addClass("red-button");
                  } else {
                      $(btn).removeClass("red-button");
                  }
                  break;

              case 10:
                  if (z == 10) {
                      $(btn).addClass("yellow-button");
                  } else {
                      $(btn).removeClass("yellow-button");
                  }
                  break;

              case 20:
                  if (z == 20) {
                      $(btn).addClass("green-button");
                  } else {
                      $(btn).removeClass("green-button");
                  }
                  break;

              case 40:
                  if (z == 40) {
                      $(btn).addClass("blue-button");
                  } else {
                      $(btn).removeClass("blue-button");
                  }
                  break;
          }
      });


      var scaling = 1.0 / view.zoom;
      var offset = 100.0 / view.zoom;
      offset = Math.min(60.0, offset);
      offset = Math.max(5.0, offset);
      lines.forEach(function (line) {
          var textRot = line.text.rotation * (Math.PI / 180.0);
          line.text.scaling = new Point(scaling, scaling);
          var mid = midPoint(line.line.firstSegment.point, line.line.lastSegment.point);
          var off = new Point(Math.abs(Math.sin(textRot)) * offset * line.offset.x, Math.abs(Math.cos(textRot)) * offset * line.offset.y);
          line.text.position = mid.add(off);
      });

      rects.forEach(function (rect) {
          var topLeft = rect.rect.bounds.topLeft;
          var topRight = rect.rect.bounds.topRight;
          var bottomRight = rect.rect.bounds.bottomRight;
          var length = topLeft.getDistance(topRight);
          var breadth = topRight.getDistance(bottomRight);
          var lMax = length / 50.0;

          var bMax = breadth / 50.0;
          bMax = Math.min(20, bMax);
          bMax = Math.max(1, bMax);
          var rScaling = Math.max(1, scaling);
          rScaling = Math.min(lMax, rScaling);

          rect.lText.scaling = new Point(rScaling, rScaling);
          var mid = midPoint(rect.rect.bounds.topLeft, rect.rect.bounds.topRight);
          var off = new Point(0, offset * rect.lOff.y);
          rect.lText.position = mid.add(off);

          rScaling = Math.max(1, scaling);
          rScaling = Math.min(bMax, rScaling);

          rect.bText.scaling = new Point(rScaling, rScaling);
          mid = midPoint(rect.rect.bounds.topRight, rect.rect.bounds.bottomRight);
          off = new Point(offset * rect.bOff.x, 0);
          rect.bText.position = mid.add(off);
      });

      circles.forEach(function (circle) {
          var maxScale = Math.min(20.0, circle.circle.radius / 50.0);
          scaling = Math.min(maxScale, scaling);
          scaling = Math.max(1, scaling);
          circle.scale.text.scaling = new Point(scaling, scaling);
          var mid = midPoint(circle.scale.line.firstSegment.point, circle.scale.line.lastSegment.point);
          var textRot = circle.scale.text.rotation * (Math.PI / 180.0);
          var off = new Point(Math.abs(Math.sin(textRot)) * offset * circle.scale.offset.x, Math.abs(Math.cos(textRot)) * offset * circle.scale.offset.y);
          circle.scale.text.position = mid.add(off);
      });
      prevZoom = z;
  });

  viewer.addHandler("rotate", function (event) {
      if (!viewerOpen) return;
      $("#btn-rotate-preset-1").removeClass("is-info");
      $("#btn-rotate-preset-2").removeClass("is-info");
      $("#btn-rotate-preset-3").removeClass("is-info");

      switch (event.degrees) {
          case 0:
              $("#btn-rotate-preset-1").addClass("is-info");
              break;
          case 90:
              $("#btn-rotate-preset-2").addClass("is-info");
              break;
          case 180:
              $("#btn-rotate-preset-3").addClass("is-info");
              break;
      }

      var homeZoom = viewer.viewport.getHomeZoom();
      if (viewer.viewport.getZoom().toFixed(2) == homeZoom.toFixed(2) && event.degrees == 0) {
          $("#home-btn").addClass("is-info");
          $("#btn-rotate-preset-1").removeClass("is-info");
      } else {
          $("#home-btn").removeClass("is-info");
      }


  });


  // Openseadragon Plugin initialization

  // Scalebar plugin
  viewer.scalebar({
      type: OpenSeadragon.ScalebarType.MICROSCOPY,
      pixelsPerMeter: ppm,
      minWidth: "160px",
      location: OpenSeadragon.ScalebarLocation.BOTTOM_RIGHT,
      yOffset: 40,
      stayInsideImage: false,
      color: "blue",
      fontColor: "blue",
      backgroundColor: "rgb(255, 255, 255, 0.8)",
      fontSize: "large",
      barThickness: 4
  });



  // Paperjs overlay
  paperOverlay = viewer.paperjsOverlay();

  // Other tool Initialization

  // Rotation slider
  $("#rotation-selector").roundSlider({
      radius: 45,
      width: 8,
      handleSize: "+8",
      handleShape: "dot",
      sliderType: "min-range",
      value: 50,
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
      fixRotatorTooltip();
  }, 500);

  function fixRotatorTooltip() {
      $(".rs-tooltip").css({
          "margin-top": "-15.5px",
          "margin-left": "-16.652px"
      });
  }

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
  annotation_font_picker = Pickr.create({
      el: '#annotation-font-picker',
      theme: 'nano', // or 'monolith', or 'nano'
      default: default_font_color,

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
  annotation_font_picker.on('save', function (event) {
      annotation_font_picker.hide();
      font_color = annotation_font_picker.getColor().toHEXA().toString();
  });

  annotation_border_picker.on('save', function (event) {
      annotation_border_picker.hide();
      stroke_color = annotation_border_picker.getColor().toHEXA().toString();
  });

  annotation_font_picker.on('change', function (event) {
      font_color = annotation_font_picker.getColor().toHEXA().toString();
  });

  annotation_border_picker.on('change', function (event) {
      stroke_color = annotation_border_picker.getColor().toHEXA().toString();
  });

  annotation_font_picker.on('show', function (event) {
      selectingColor = true;
  });

  annotation_border_picker.on('show', function (event) {
      selectingColor = true;
  });

  annotation_font_picker.on('hide', function (event) {
      selectingColor = false;
  });

  annotation_border_picker.on('hide', function (event) {
      selectingColor = false;
  });

  $("#stroke-width-input").on('change', function (event) {
      stroke_width = event.target.valueAsNumber;
      stroke_width = stroke_width / viewZoom;
  });


  // Helper Functions
  function updateRotation(deg) {
      viewer.viewport.setRotation(deg);
  }

  function resetZoomButtons() {
      $("#zoom-buttons").children().removeClass("btn-active");
  }

  function addOverlay(text, overlay) {
      // Add Tooltip with text
      var tooltip = createCard(text, overlay);
      var deleteButton = tooltip.delete;
      overlay.annotation = text;
      overlay.tooltip = tooltip.card;

      var editButton = tooltip.edit;
      var confirmationModal = $("#delete-confirm").clone();
      $(confirmationModal).children(".modal-content").children(".card").css({
          "width": "300px",
          "margin": "auto"
      });
      $(confirmationModal).attr('id', '');
      $("#page").append(confirmationModal);
      $(deleteButton).click(function () {
          $(confirmationModal).addClass('is-active');
      });


      $(confirmationModal).children().find("#cancel-button").click(function () {
          $(confirmationModal).removeClass('is-active');
      });

      $(confirmationModal).children().find("#delete-button").click(function () {
          $(confirmationModal).removeClass('is-active');
          $(confirmationModal).remove();
          $(tooltip).remove();
          if (overlay.type == 'c') {
              overlay.circle.remove();
              overlay.scale.text.remove();
              overlay.scale.line.remove();
              circles.splice(overlay.id, 1);
              for (var i = 0; i < circles.length; i++) {
                  circles[i].id = i;
              }
          } else if (overlay.type == 'r') {
              overlay.rect.remove();
              overlay.lText.remove();
              overlay.bText.remove();
              rects.splice(overlay.id, 1);
              for (var j = 0; j < rects.length; j++) {
                  rects[j].id = j;
              }
          } else if (overlay.type == 'l') {
              overlay.line.remove();
              overlay.text.remove();
              lines.splice(overlay.id);
              for (var k = 0; k < rects.length; k++) {
                  lines[k].id = k;
              }
          }

      });

      $(editButton).click(function () {
          $("#annotation-modal-title").html("Edit Annotation");
          $("#annotation-modal").addClass("is-active");
          $("#annotation-save-btn").val(overlay.type + '-' + overlay.id);
          editMode = true;
          $("#annotation-text").val(overlay.annotation);
          currentEditingOverlay = overlay;
      });

      $("#page").append(tooltip.card);
      tooltip = $(tooltip.card);
      var shape;
      if (overlay.type == 'r') {
          shape = overlay.rect;
      } else if (overlay.type == 'c') {
          shape = overlay.circle;
      } else if (overlay.type == 'l') {
          shape = overlay.line;
      }

      shape.onMouseEnter = function (e) {
          overlay.hover = true;
          if (overlay.type == 'c') {
              overlay.scale.text.visible = true;
              overlay.scale.line.visible = true;
          } else if (overlay.type == 'r') {
              overlay.bText.visible = true;
              overlay.lText.visible = true;
          }

          var posX = 0;
          var posY = 0;


          if (overlay.type == 'r') {
              var point = view.projectToView(overlay.rect.strokeBounds.bottomRight);
              posX = point.x - (tooltip.width() / 2);
              posY = point.y + $(".navbar").height();
          } else if (overlay.type == 'c') {
              var center = view.projectToView(overlay.circle.position.add(new Point(0, overlay.circle.radius)));
              posX = center.x;
              posY = center.y;
          } else if (overlay.type == 'l') {
              var mouseP = view.projectToView(e.point);
              posX = mouseP.x;
              posY = mouseP.y;
          }
          tooltip.css({
              top: posY,
              left: posX,
              position: 'absolute'
          });
          if (!annotation_closed) {
              tooltip.show();
          }
      };

      shape.onMouseLeave = function (e) {
          overlay.hover = false;
          if (!tooltip.is(':hover'))
              tooltip.hide();

          if (overlay.type == 'c') {
              overlay.scale.text.visible = false;
              overlay.scale.line.visible = false;
          } else if (overlay.type == 'r') {
              overlay.bText.visible = false;
              overlay.lText.visible = false;
          }

          annotation_closed = false;
      };

  }


  function createCard(message, overlay) {
      var card = document.createElement('div');
      $(card).addClass('card');
      var closeButton = document.createElement('a');
      $(closeButton).addClass('delete');
      $(closeButton).addClass('card-close');
      $(card).append(closeButton);

      var width = message.length == 0 ? "180px" : "200px";
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

      $(card).hover(function () {
          $(card).show();
      }, function () {
          if (!overlay.hover) {
              $(card).hide();
          }
      });

      return {
          card: card,
          delete: deleteButton,
          edit: editButton
      };
  }

  function closeAnnotation() {
      $("canvas").removeClass('cursor-crosshair');
  }

  function resetAnnotationModal() {
      $("#annotation-text").val('');
      $("#annotation-modal-title").html("Add Annotation");
  }

  function updateAnnotation(text) {
      if (text.length == 0 && currentEditingOverlay.annotation.length !== 0) {
          currentEditingOverlay.tooltip.find(".card-content").remove();
      } else if (text.length != 0 && currentEditingOverlay.annotation.length === 0) {
          var cardContent = document.createElement('div');
          $(cardContent).addClass('card-content');
          var paragraph = document.createElement('p');
          $(paragraph).append(text);
          $(cardContent).append(paragraph);
          $(currentEditingOverlay.tooltip).append(cardContent);
      } else if (text.length != 0 && currentEditingOverlay.annotation.length !== 0) {
          $(currentEditingOverlay.tooltip).find(".card-content").children('p').html(text);
      }
  }

  // Event Handlers

  // Toolbar Buttons

  $("#zoomin-btn").click(function () {
      resetZoomButtons();
  });

  $("#zoomout-btn").click(function () {
      resetZoomButtons();
  });

  // Zoom Preset Buttons
  $(".zoom-button").click(function (e) {
      viewer.viewport.zoomTo(parseInt(e.target.value));
  });

  $("#screenshot-btn").click(function () {
      $(this).addClass("is-success");
      $("#loading-modal").addClass("is-active");
      var parent = $('.openseadragon-container').get(0);
      var toBeHidden = $(parent).children().get(2);
      $(toBeHidden).hide();
      html2canvas($("#openseadragon-viewer").get(0)).then(function (canvas) {
          Canvas2Image.saveAsPNG(canvas);
          $("#loading-modal").removeClass("is-active");
          $(toBeHidden).show();
          $("#screenshot-btn").removeClass("is-success");
      });
  });


  $("#btn-rotate-preset-1").click(function () {
      rotator.setValue(0);
      updateRotation(0);
      fixRotatorTooltip();
  });

  $("#btn-rotate-preset-2").click(function () {
      rotator.setValue(90);
      updateRotation(90);
      fixRotatorTooltip();
  });

  $("#btn-rotate-preset-3").click(function () {
      rotator.setValue(180);
      updateRotation(180);
      fixRotatorTooltip();
  });

  $("#rotation-selector-dropdown").hover(function () {
      $(this).addClass("is-active");
      $("#rotation-dropdown-button").addClass("is-info");
  }, function () {
      $(this).removeClass("is-active");
      $("#rotation-dropdown-button").removeClass("is-info");
  });

  $("#draw-menu-dropdown").hover(function () {
      $(this).addClass("is-active");
      $("#draw-button").addClass("is-danger");
  }, function () {
      if (!selectingColor) {
          $(this).removeClass("is-active");
          if (drawMode === 0) {
              $("#draw-button").removeClass("is-danger");
          }
      }
  });

  $("#line-button").click(function () {
      if (drawMode !== 1)
          changeDrawMode(1);
      else
          changeDrawMode(0);
  });

  $("#rect-button").click(function () {
      if (drawMode !== 2)
          changeDrawMode(2);
      else
          changeDrawMode(0);
  });

  $("#circle-button").click(function () {
      if (drawMode !== 3)
          changeDrawMode(3);
      else
          changeDrawMode(0);
  });

  // Modal Control Events (Modal for annotation input)

  $(".annotation-modal-close ").click(function () {
      $("#annotation-modal").removeClass("is-active");
      if (!editMode) {
          if (lastOverlay.type == 'r') {
              lastOverlay.rect.remove();
              lastOverlay.lText.remove();
              lastOverlay.bText.remove();
          } else if (lastOverlay.type == 'c') {
              lastOverlay.circle.remove();
              lastOverlay.scale.text.remove();
              lastOverlay.scale.line.remove();
          } else if (lastOverlay.type == 'l') {
              lastOverlay.line.remove();
              lastOverlay.text.remove();
          }
      }
      editMode = false;
      resetAnnotationModal();
      closeAnnotation();
  });

  $("#annotation-save-btn").click(function (event) {
      $("#annotation-modal").removeClass("is-active");
      var text = $("#annotation-text").val();
      if (editMode) {
          updateAnnotation(text);
      } else {
          if (lastOverlay.type == 'r') {
              rects.push(lastOverlay);
          } else if (lastOverlay.type == 'c') {
              circles.push(lastOverlay);
          } else if (lastOverlay.type == 'l') {
              lines.push(lastOverlay);
          }
          addOverlay(text, lastOverlay);
      }
      editMode = false;
      closeAnnotation();
      resetAnnotationModal();
  });

  $("#border-width-input").on('change', function (event) {
      var height = event.target.value;
      $("#border-example").css("height", height);
  });


  // Resize event
  window.onresize = function () {
      paperOverlay.resize();
      paperOverlay.resizecanvas();
      var navbarHeight = $(".navbar").height();
      var pageHeight = $("#page").height();
      $("#openseadragon-viewer").height(pageHeight - navbarHeight);
      setTimeout(function () {
          if (viewer.viewport.getZoom() < viewer.viewport.getHomeZoom()) {
              viewer.viewport.zoomTo(viewer.viewport.getHomeZoom());
          }
          viewer.viewport.minZoomLevel = viewer.viewport.getHomeZoom();
      }, 100);
  };


  // Paperjs Drawing tool

  // Openseadragon Mouse events
  var mouseTracker = new OpenSeadragon.MouseTracker({
      element: viewer.canvas,
      pressHandler: pressHandler,
      dragHandler: dragHandler,
      dragEndHandler: dragEndHandler,
      scrollHandler: resetZoomButtons,
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
      changeDrawMode(0);
  }


  // Helper function
  function linePressHandler() {
      currentLine = {

          line: new Path(),
          text: null,
          offset: null,
      };
      currentLine.line.strokeColor = stroke_color;
      currentLine.line.fillColor = currentLine.line.strokeColor;
      currentLine.line.strokeWidth = stroke_width;
      currentLine.line.add(startPoint);
  }

  function lineDragHandler(current) {
      var firstSeg = currentLine.line.firstSegment;
      if (currentLine.text === null) {
          var newText = createText(firstSeg.point, current, 20 * view.zoom, 200 * view.zoom);
          currentLine.text = newText.text;
          currentLine.offset = newText.offset;
      }
      currentLine.text.remove();
      var nText = createText(firstSeg.point, current, 20 * view.zoom, 200 * view.zoom);
      currentLine.text = nText.text;
      currentLine.offset = nText.offset;
      currentLine.line.removeSegments();
      currentLine.line.add(firstSeg, current);
  }

  function lineDragEndHandler(current) {
      var dup = {
          line: currentLine.line.clone(),
          text: currentLine.text.clone(),
          offset: currentLine.offset,
          id: lines.length,
          hover: false,
          annotation: '',
          type: 'l'
      };
      lastOverlay = dup;

      currentLine.line.remove();
      currentLine.text.remove();
      currentLine = null;
      $("#annotation-modal").addClass('is-active');
      $("#annotation-save-btn").val('l');
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
      currentCircle.scale.line.strokeColor = font_color;
      currentCircle.scale.line.strokeWidth = 10 * viewZoom;
      // currentCircle.scale.line.dashArray = [40, 40];
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


  }

  function circleDragEndHandler(current) {
      if (currentCircle !== null) {
          var c = createCircle(currentCircle.circle.position, currentCircle.circle.radius);
          var s = {
              line: currentCircle.scale.line.clone(),
              text: currentCircle.scale.text.clone(),
              offset: currentCircle.scale.offset.clone()
          };
          var obj = {
              id: circles.length,
              type: 'c',
              circle: c,
              scale: s,
              hover: false
          };

          lastOverlay = obj;

          s.line.visible = false;
          s.text.visible = false;

          currentCircle.circle.remove();
          currentCircle.scale.line.remove();
          currentCircle.scale.text.remove();
          $("#annotation-modal").addClass('is-active');
          $("#annotation-save-btn").val('c');
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
      var topLeft = currentRect.rect.bounds.topLeft;
      var topRight = currentRect.rect.bounds.topRight;
      var bottomRight = currentRect.rect.bounds.bottomRight;
      var length = topLeft.getDistance(topRight);
      var breadth = topRight.getDistance(bottomRight);
      var lMax = length / 50.0;
      lMax = Math.min(20, lMax);
      lMax = Math.max(2, lMax);

      var bMax = breadth / 50.0;
      bMax = Math.min(20, bMax);
      bMax = Math.max(2, bMax);

      if (currentRect.lText === null) {
          var newText = createText(topLeft, topRight, 1, lMax);
          currentRect.lText = newText.text;
          currentRect.lOff = newText.offset;
      }
      currentRect.lText.remove();
      var nText = createText(topLeft, topRight, 1, lMax);
      currentRect.lText = nText.text;
      currentRect.lOff = nText.offset;

      if (currentRect.bText === null) {
          var newRText = createText(topRight, bottomRight, 1, bMax);
          currentRect.bText = newRText.text;
          currentRect.bOff = newRText.offset;
      }
      currentRect.bText.remove();
      var nRText = createText(topRight, bottomRight, 1, bMax);
      currentRect.bText = nRText.text;
      currentRect.bOff = nRText.offset;

  }

  function rectDragEndHandler(current) {
      if (currentRect.rect !== null) {
          var finalRect = createRect(startPoint, current);
          var obj = {
              id: rects.length,
              type: 'r',
              rect: finalRect,
              lText: currentRect.lText.clone(),
              lOff: currentRect.lOff,
              bText: currentRect.bText.clone(),
              bOff: currentRect.bOff,
              hover: false
          };
          lastOverlay = obj;
          obj.lText.visible = false;
          obj.bText.visible = false;
          currentRect.rect.remove();
          currentRect.lText.remove();
          currentRect.bText.remove();

          // Open annotation menu
          resetAnnotationModal();
          $("#annotation-modal").addClass("is-active");
          $("#annotation-save-btn").val('r');
      }
  }


  function createCircle(center, radius) {
      var c = new Shape.Circle(center, radius);
      c.strokeColor = stroke_color;
      c.fillColor = 'rgba(255, 255, 255, 0.05)';
      c.strokeWidth = stroke_width;
      return c;
  }

  function createRect(from, to) {
      var c = new Shape.Rectangle(from, to);
      c.strokeColor = stroke_color;
      c.fillColor = 'rgba(255, 255, 255, 0.05)';
      c.strokeWidth = stroke_width;
      return c;
  }

  function createText(start, end, sl, su) {
      var yOff = -1;
      var xOff = 1;
      var z = view.zoom;
      var rot = angleFromHorizontal(start, end);
      // If in first or third quadrand
      if ((end.x > start.x && end.y < start.y) || (end.x < start.x && end.y > start.y)) {
          rot = rot * -1;
          xOff = xOff * -1;
      }

      var offset = 100.0 / z;
      offset = Math.min(30.0, offset);
      offset = Math.max(5.0, offset);
      var textRot = rot * (Math.PI / 180.0);
      var off = new Point(Math.abs(Math.sin(textRot)) * offset * xOff, Math.abs(Math.cos(textRot)) * offset * yOff);

      var text = new PointText(midPoint(start, end).add(off));
      text.justification = 'center';
      text.fillColor = font_color;
      text.rotation = rot;
      text.fontFamily = 'sans serif';

      var scaling = 1.0 / z;
      // scaling = Math.max(sl, scaling);
      // scaling = Math.min(su, scaling);
      text.scaling = new Point(scaling, scaling);
      text.fontWeight = 600;

      text.content = converterToSI(start.getDistance(end));
      return {
          text: text,
          offset: new Point(xOff, yOff),
      };

  }

  function converterToSI(val) {
      val = val / ppm;
      var unit = 'm';
      // Convert to mm 
      val = val * 1000.0;
      unit = '\u339c';
      var test = parseInt(val * 1000);
      if (test.toString().length <= 2) {
          val = val * 1000.0;
          unit = '\u339b';
          test = parseInt(val * 1000);
          if (test.toString().length <= 2) {
              val = val * 1000.0;
              unit = '\u339a';
          }
      }
      val = val.toFixed(2);
      return val.toString() + unit;
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

  function changeDrawMode(mode) {
      $("#draw-button").removeClass("is-danger");
      $("#line-button").removeClass("is-success");
      $("#rect-button").removeClass("is-success");
      $("#circle-button").removeClass("is-success");
      drawMode = mode;
      if (mode === 0) {
          viewer.setMouseNavEnabled(true);
          $("canvas").removeClass('cursor-crosshair');
      } else {
          viewer.setMouseNavEnabled(false);
          $("#draw-button").addClass("is-danger");
          $("canvas").addClass('cursor-crosshair');
          if (mode === 1) {
              $("#line-button").addClass("is-success");
          } else if (mode === 2) {
              $("#rect-button").addClass("is-success");
          } else if (mode === 3) {
              $("#circle-button").addClass("is-success");
          }
      }
  }


});