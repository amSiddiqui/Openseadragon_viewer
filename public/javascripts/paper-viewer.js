paper.install(window);
$(document).ready(function () {
    // Setup paper
    paper.setup($("#paint").get(0));


    var tool1 = new Tool();
    var tool2 = new Tool();
    var tool3 = new Tool();
    var path;
    var circle = null;
    var rectangle = null;
    var rects = [];
    var circles = [];


    function onMouseDown(event) {
        path = new Path();
        path.strokeColor = 'black';
        path.add(event.point);
    }

    tool1.onMouseDown = onMouseDown;

    tool1.onMouseDrag = function(event) {
        var firstSeg = path.firstSegment;
        path.removeSegments();
        path.add(firstSeg, event.point);
    };

    tool2 = new Tool();
    tool2.onMouseDown = onMouseDown;

    tool2.onMouseDrag = function(event) {
        if (circle === null) {
            circle = createCircle(path.firstSegment.point, (event.point.getDistance(path.firstSegment.point)));
        }
        circle.remove();
        circle = createCircle(path.firstSegment.point, (event.point.getDistance(path.firstSegment.point)));
    };

    tool2.onMouseUp = function() {
        if (circle !== null) {
            circles.push(createCircle(circle.position, circle.radius));
            circle.remove();
        }
    };


    tool3.onMouseDown = onMouseDown;

    tool3.onMouseDrag = function(event) {
        if (rectangle === null)  {
            rectangle = createRect(path.firstSegment.point, event.point);
        }
        rectangle.remove();
        rectangle = createRect(path.firstSegment.point, event.point);
    };

    tool3.onMouseUp = function(event) {
        if (rectangle !== null) {
            rects.push(createRect(path.firstSegment.point, event.point));
            rectangle.remove();
        }
    };

    function createCircle(center, radius) {
        var c = new Shape.Circle(center, radius);
        c.strokeColor = 'black';
        return c;
    }

    function createRect(from, to) {
        var c = new Shape.Rectangle(from, to);
        c.strokeColor = 'black';
        return c;
    }

    $("#pen").click(function() {
        tool1.activate();
    });

    $("#circle").click(function() {
        tool2.activate();
    });

    $("#rect").click(function() {
        tool3.activate();
    });


    
});