// redraw all views 
function redraw(ps) {
	for (var vi in ps.views) {
		var v = ps.views[vi];
		v.draw();
	}
}

// create some test content in a PaperScope
function createTestContent(ps) {
	paper = ps;
	
    // some test content
    var path = new ps.Path();
    // Give the stroke a color
    path.strokeColor = 'black';
    var start = new ps.Point(100, 100);
    // Move to start and draw a line from there
    path.moveTo(start);
    // Note the plus operator on Point objects.
    // PaperScript does that for us, and much more!
    path.lineTo(new ps.Point( 200, 50 ));

   	var myPath;    
   	myPath = new ps.Path();
   	myPath.strokeColor = 'black';
   	myPath.strokeWidth = 3;
   	myPath.add(new ps.Point(100,100));
   	myPath.add(new ps.Point(200,200));
   	
   	myPath = new ps.Path.Line(new ps.Point(200,100), new ps.Point(100,200));
   	myPath.strokeColor = 'black';
   	myPath.strokeWidth = 3;

   	var myCircle = new ps.Path.Circle(new paper.Point(150,150), 30);
   	myCircle.fillColor = 'black';
   	
   	/*
   	// some test interactivity
    var drawTool = new ps.Tool();
    drawTool.onMouseDown = function(event) {
    	paper = ps;

    	//console.log('onMouseDown('+event.point+')');
    	
    	var myCircle = new ps.Path.Circle(event.point, 3);
    	myCircle.fillColor = 'black';
    	
    	myPath = new ps.Path();
    	myPath.strokeColor = 'black';
    	myPath.add(event.point);
    	//console.log('myPath='+myPath);
    };
    drawTool.onMouseDrag = function(event) {
    	paper = ps;

    	//console.log('myPath='+myPath);
    	myPath.add(event.point);
    	//console.log('onMouseDrag');
    };
    drawTool.onMouseUp = function(event) { 
    	paper = ps;

    	myPath.simplify();

    	redraw(ps);
    };
    drawTool.activate();
	*/
}

var paperScopes = new Array();

// set up a PaperScope with overview and detail canvases
function setupOverviewAndDetail(overviewId, detailId) {

	var ps = new paper.PaperScope();
    paperScopes.push(ps);
    
    var overviewCanvas = document.getElementById(overviewId);
    //ps.setup(overviewCanvas);
    
    var p = new paper.Project();
    p.activate();

    new paper.View(overviewCanvas);
    // for some reason, setting the size via CSS on the Canvas doesn't seem to work.
	// the view stays 300x150
	//ps.view.viewSize = new ps.Size(300,300);
    //var v = ps.view;    
	// Create a Paper.js Path to draw a line into it:
    
    createTestContent(ps);
   	
    // Draw the view now:
    //?ps.view.draw();
	
    var detailCanvas = document.getElementById(detailId);
    console.log('detailCanvas '+detailId+' = '+detailCanvas);
    new ps.View(detailCanvas);
   
    // mouse/key tool
    var drawTool = new ps.Tool();
    drawTool.onMouseDown = function(event) {
    	paper = ps;

    	console.log('onMouseDown('+event.point+')');
    };
    drawTool.onMouseDrag = function(event) {
    	paper = ps;

    	console.log('onMouseDrag('+event.point+')');
    };
    drawTool.onMouseUp = function(event) { 
    	paper = ps;

    	console.log('onMouseUp('+event.point+')');
    };
    drawTool.onMouseMove = function(event) { 
    	paper = ps;

    	console.log('onMouseMove('+event.point+')');
    };
    //drawTool.onKeyDown = function(event) {
    //	console.log('onKeyDown('+event.key+')');
    //};
    //drawTool.onKeyUp = function(event) {
    //	console.log('onKeyUp('+event.key+')');
    //};
    drawTool.activate();
	
}

// some special key codes - from http://www.quirksmode.org/js/keys.html#t00
var KEY_BACKSPACE = 8;
var KEY_TAB = 9;
var KEY_SHIFT = 16;
var KEY_CTRL = 17;
var KEY_CAPSLOCK = 20;
var KEY_PAGEUP = 33;
var KEY_PAGEDOWN = 34;
var KEY_END = 35;
var KEY_HOME = 36;
var KEY_LEFT = 37;
var KEY_UP = 38;
var KEY_RIGHT = 39;
var KEY_DOWN = 40;
var KEY_INSERT = 45;
var KEY_DELETE = 46;
var KEY_NUMLOCK = 144;
var KEY_ENTER = 13;
var KEY_ESCAPE = 27;
var KEY_F1 = 112;
//...
var KEY_F12 = 123;

function isSpecialKey(which) {
	switch (which) {
	case KEY_BACKSPACE:
	case KEY_CTRL:
/*	case KEY_CAPSLOCK:
	case KEY_PAGEUP:
	case KEY_PAGEDOWN:
	case KEY_END:
	case KEY_HOME:
	case KEY_LEFT:
	case KEY_UP:
	case KEY_RIGHT:
	case KEY_DOWN:
	case KEY_INSERT:
	case KEY_DELETE:
	case KEY_NUMLOCK:
	case KEY_ENTER:
	case KEY_ESCAPE:
*/		return true;
	default:
		if (which>=KEY_F1 && which<=KEY_F12)
			return true;
		return false;
	}
}

// Only executed our code once the DOM is ready.
$(document).ready(function() {
	
	// capture document-wide key presses, including special keys
	$(document).keydown(function(ev) {
		// Note: this is not meant to be called multiple times when key is held down, but on Chrome
		// it is being, so that will need some filtering
		console.log('keydown: '+ev.which+' ctrlKey='+ev.ctrlKey+' special='+isSpecialKey(ev.which));
		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			ev.stopPropagation();
			return false;
		}
	});
	$(document).keyup(function(ev) {
		console.log('keyup: '+ev.which);
		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			ev.stopPropagation();
			return false;
		}
	});
	$(document).keypress(function(ev) {
		console.log('keypress: '+ev.which+' ctrlKey='+ev.ctrlKey);
	});
	
	setupOverviewAndDetail('objectOverviewCanvas', 'objectDetailCanvas');
        
    function handleResize() {
    	console.log('handle resize');
    	for (var psi in paperScopes) {
    		var ps = paperScopes[psi];
        	console.log('paperscope with '+ps.views);
    		for (var vi in ps.views) {
    			var v = ps.views[vi];
           		console.log('canvas:resize to '+$(v.canvas).width()+","+$(v.canvas).height());
           		// need to force a change or it does some weird partial rescaling
           		v.viewSize = new ps.Size(1,1);
           		v.viewSize = new ps.Size($(v.canvas).width(),$(v.canvas).height());
    		}
    	}
    }
    $(window).resize(handleResize);
    handleResize();
});
