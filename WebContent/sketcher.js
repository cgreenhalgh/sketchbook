// Note, problems with paperjs versions.
// Nightly build recent (July 2012) throws an exception early on in the View initialisation
// with view apparently null.
// Stable release 0.2.2 has (at least) a bug in the way the centre is updated when zooming. See
// NB: https://github.com/eric-wieser/paper.js/tree/patch-1
// "Fixed bad centering when `view.center` and `view.zoom` are changed"

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
	paper = ps;
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
    /*
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
	*/
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

// common mouse/key interaction state
var mouseTarget = undefined;
var mousePageX = undefined;
var mousePageY = undefined;
var keyTarget = undefined;
var keyDown = undefined;

/** get paperjs view for event target iff it is a canvas.
 * also initialises global paper if found.
 * 
 * @return View if found, else null
 */ 
function getView(target) {
	for (var psi in paperScopes) {
		var ps = paperScopes[psi];
    	//console.log('paperscope with '+ps.views);
		for (var vi in ps.views) {
			var v = ps.views[vi];
			if (v.canvas===mouseTarget) {
				//console.log('- - in view2 '+v);
				paper = ps;
				v.activate();
				//ps.projects[0].activate();
				return v;
			}
		}
	}
	return null;
}

/** line tool */
var lineTool = new Object();
var lineToolPath = undefined;

lineTool.begin = function(point) {
	console.log('lineTool.begin '+point);
	
	lineToolPath = new paper.Path();
	lineToolPath.strokeColor = 'black';
	lineToolPath.add(point);	
};
lineTool.move = function(point) {
	//console.log('lineTool.move '+point);

	lineToolPath.add(point);
};
lineTool.end = function(point) {
	console.log('lineTool.end'+point);

	lineToolPath.simplify();
	lineToolPath = undefined;
};

/** convert CSS points to screen pixels, see http://stackoverflow.com/questions/279749/detecting-the-system-dpi-ppi-from-js-css */
function pt2px(pt) {
	screenPPI = document.getElementById('ppitest').offsetWidth;
	return pt*screenPPI/72;
}

/** workaround for editable multi-line text */
function createTextBlock(point, lines, justification) {
	if (justification===undefined)
		justification = 'center';
	var characterStyle = { fillColor: 'black', fontSize: 12 };
	var lineSpacing = pt2px(characterStyle.fontSize)*1.15;
	var block = new paper.Group();
	for (var li in lines) {
		var line = lines[li];
		var text = new paper.PointText(new paper.Point(point.x, point.y));
		text.content = line;
		text.paragraphStyle.justification = justification;
		text.characterStyle = characterStyle;
		block.addChild(text);
		point.y = point.y + lineSpacing;
	}
}

/** text tool */
var textTool = new Object();
var textToolOutline = undefined;
var textToolText = undefined;
var textToolBegin = undefined;
var textToolPos = 0;

textTool.begin = function(point) {
	console.log('textTool.begin '+point);
	textToolBegin = point;
};
textTool.move = function(point) {
	//console.log('lineTool.move '+point);
	if (textToolOutline)
		textToolOutline.remove();
	textToolOutline = new paper.Path.Rectangle(textToolBegin, point);
	textToolOutline.strokeColor = 'grey';
	textToolOutline.dashArray = [10,4];
};
textTool.end = function(point) {
	console.log('textTool.end'+point);
	if (textToolOutline) {
		textToolOutline.remove();
		textToolOutline = undefined;
	}
	var width = Math.abs(point.x-textToolBegin.x);
	var x = (point.x+textToolBegin.x)/2;
	var y = (point.y+textToolBegin.y)/2;
	textToolBegin = undefined;
	createTextBlock(new paper.Point(x, y), ['testing','testing','1, 2, 3...']);
};

/** zoom in tool */
var zoomInTool = new Object();
var zoomOutTool = new Object();
var ZOOM_INTERVAL = 20;
var ZOOM_RATIO = 0.02;
var zoomInterval = undefined;
var zoomPoint = undefined;
var zoomView = undefined;

function zoomIn() {
	if (!zoomView || !zoomPoint)
		return;
	// zoom towards zoomPoint in project space
	var zoom = zoomView.zoom;
	console.log('zoomIn point='+zoomPoint+' zoom='+zoomView.zoom+' center='+zoomView.center);
	zoomView.zoom = zoomView.zoom*(1+ZOOM_RATIO);
	var dx = zoomPoint.x-zoomView.center.x;
	var dy = zoomPoint.y-zoomView.center.y;
	var sdx = (ZOOM_RATIO*dx*zoom)/zoomView.zoom;
	var sdy = (ZOOM_RATIO*dy*zoom)/zoomView.zoom;
	console.log('- d='+dx+','+dy+' zoom\'='+zoomView.zoom+' sd='+sdx+','+sdy);
	zoomView.center = new paper.Point(zoomView.center.x+sdx, zoomView.center.y+sdy);
	console.log('- center\'='+zoomView.center);
}

function zoomOut() {
	if (!zoomView || !zoomPoint)
		return;
	// zoom away from zoomPoint in project space
	console.log('zoomOut point='+zoomPoint+' zoom='+zoomView.zoom+' center='+zoomView.center);
	var zoom = zoomView.zoom;
	zoomView.zoom = zoomView.zoom*(1-ZOOM_RATIO);
	var dx = zoomPoint.x-zoomView.center.x;
	var dy = zoomPoint.y-zoomView.center.y;
	var sdx = (ZOOM_RATIO*dx*zoom)/zoomView.zoom;
	var sdy = (ZOOM_RATIO*dy*zoom)/zoomView.zoom;
	console.log('- d='+dx+','+dy+' zoom\'='+zoomView.zoom+' sd='+sdx+','+sdy);
	zoomView.center = new paper.Point(zoomView.center.x-sdx, zoomView.center.y-sdy);
	console.log('- center\'='+zoomView.center);
}

zoomInTool.begin = function(point, view) {
	zoomPoint = point;
	zoomView = view;
	zoomInterval = setInterval(zoomIn, ZOOM_INTERVAL);
	zoomIn();
};
zoomOutTool.begin = function(point, view) {
	zoomPoint = point;
	zoomView = view;
	zoomInterval = setInterval(zoomOut, ZOOM_INTERVAL);
	zoomOut();
};
zoomOutTool.move = zoomInTool.move = function(point) {
	zoomPoint = point;	
};
zoomOutTool.end = zoomInTool.end = function(point) {
	zoomPoint = point;		
	clearInterval(zoomInterval);
	zoomView = undefined;
};

/** get key string for code */
function getToolKeyWhich(which) {
	return 'code'+which;
}
/** get key string for char */
function getToolKeyChar(c) {
	return 'code'+c.charCodeAt(0);
}

/** global - all tools keys by key */
var tools = new Object();
tools[getToolKeyChar('A')] = lineTool;
tools[getToolKeyChar('S')] = textTool;
tools[getToolKeyChar('Z')] = zoomInTool;
tools[getToolKeyChar('X')] = zoomOutTool;

var tool = undefined;
var toolView = undefined;

/** function to map view pixel position to project coordinates.
 * @return Point */
function view2project(view, vx, vy) {
	var px = (vx-view.canvas.width/2)/view.zoom+view.center.x;
	var py = (vy-view.canvas.height/2)/view.zoom+view.center.y;
	return new paper.Point(px, py);
}

// Only executed our code once the DOM is ready.
$(document).ready(function() {
	
	// capture document-wide key presses, including special keys
	$(document).keydown(function(ev) {
		if (ev.which==keyDown) {
			//console.log('ignore duplicate keydown for '+ev.which);
			ev.stopPropagation();
			return false;
		}
		keyDown = ev.which;
		// Note: this is not meant to be called multiple times when key is held down, but on Chrome
		// it is being, so that will need some filtering
		console.log('keydown: '+ev.which+' ctrlKey='+ev.ctrlKey+' special='+isSpecialKey(ev.which));

		if (tool) {
			// switch tool
			tool.end(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			tool = undefined;
			redraw(paper);
		}
		keyTarget = mouseTarget;
		var v = getView(keyTarget);
		if (v) {
			var t = tools[getToolKeyWhich(ev.which)];
			if (t) {
				console.log('begin tool '+t);
				tool = t;
				toolView = v;
				tool.begin(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop), v);
				redraw(paper);
			}
		}
		
		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			ev.stopPropagation();
			return false;
		}
	});
	$(document).keyup(function(ev) {
		keyDown = undefined;
		if (tool) {
			// switch tool
			tool.end(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			redraw(paper);
			tool = undefined;
		}
		console.log('keyup: '+ev.which);
		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			ev.stopPropagation();
			return false;
		}
	});
	$(document).keypress(function(ev) {
		console.log('keypress: '+ev.which+' at '+mousePageX+','+mousePageY+' on '+mouseTarget+' = '+(mousePageX-mouseTarget.offsetLeft)+','+(mousePageY-mouseTarget.offsetTop));
//		var v = getView(mouseTarget);
//		if (v) {
//			// test content
//	    	var myText = new paper.PointText(new paper.Point(mousePageX-mouseTarget.offsetLeft, mousePageY-mouseTarget.offsetTop));
//	    	myText.content = String.fromCharCode(ev.which);
//	    	myText.strokeColor = 'black';
//	    	redraw(paper);
//		}
	});
	$(document).mousemove(function(ev) {
		//console.log('mousemove: '+ev.pageX+','+ev.pageY+' on '+ev.target+' = '+(ev.pageX-ev.target.offsetLeft)+','+(ev.pageY-ev.target.offsetTop));
		mouseTarget = ev.target;
		mousePageX = ev.pageX;
		mousePageY = ev.pageY;
		if (tool) {
			tool.move(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			redraw(paper);
		}
	});
	$(document).mousedown(function(ev) {
		// which: 1=left, 2=middle, 3=right
		console.log('mousedown: '+ev.which+' at '+ev.pageX+','+ev.pageY+' on '+ev.target+' = '+(ev.pageX-ev.target.offsetLeft)+','+(ev.pageY-ev.target.offsetTop));
		if (tool) {
			// switch tool
			tool.end(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			redraw(paper);
			tool = undefined;
		}
		keyTarget = ev.target;
		var v = getView(ev.target);
		if (v) {
			// test content
	    	var myCircle = new paper.Path.Circle(new paper.Point(ev.pageX-ev.target.offsetLeft, ev.pageY-ev.target.offsetTop), 3);
	    	myCircle.fillColor = 'black';
	    	redraw(paper);
		}
	});
	$(document).mouseup(function(ev) {
		console.log('mouseup: '+ev.which+' on '+ev.target);
	});
	// mousedown, mouseup, mouseenter, mouseleave
	
	
	// create object editor paperjs scope/project/views
	setupOverviewAndDetail('objectOverviewCanvas', 'objectDetailCanvas');

	// work-around for canvas sizing problem
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
