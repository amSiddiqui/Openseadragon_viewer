$(document).ready(function() {
    $("#save").click(function() {
        html2canvas($("#parent").get(0)).then(function (canvas) {
            console.log(canvas);
            Canvas2Image.saveAsPNG(canvas);
        });
    });
});