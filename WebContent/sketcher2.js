// sketcher2.js

// global state
// Sketchbook
var sketchbook;

//==============================================================================
// reset state and interface, e.g. from onLoad
function clearAll() {
	sketchbook = new Sketchbook();
	// TODO
}

// unmarshall and update interface, e.g. from onLoad
function restoreState(jstate) {
	sketchbook.unmarshall(jstate);
	// TODO
}

//===============================================================================
// GUI Entry points from sketcher2.html:
// - onNewObject()
// - onSave()
// - onShowIndex() - show index tab
// - onShowSequences() - show sequences tab
// - onObjectFilterChanges() - change to any of several object filter text fields

// GUI entry point
function onNewObject() {
	// TODO
}

// GUI entry point
function onSave() {
	var jstate = sketchbook.marshall();
	var bb = new BlobBuilder();
	bb.append(JSON.stringify(jstate));
	var filename = $('#filenameText').val()+'.json';
	saveAs(bb.getBlob(), filename);
	// OK!
	console.log('saved sketchbook as '+filename);
	sketchbook.changed = false;
}

// GUI callback
function onLoad(evt) {

	if (sketchbook.changed)
		onSave();
	
	clearAll();
	
	/** save. 
	 * NB uses propsed/html5 FileSaver API, as supported by 
	 * https://github.com/eligrey/FileSaver.js https://github.com/eligrey/BlobBuilder.js
	 * see also http://eligrey.com/blog/post/saving-generated-files-on-the-client-side */

	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.

	    var files = evt.target.files; // FileList object
		if (files.length==0) {
			console.log('no file specified');
			return;
		}
		var f = files[0];
	    console.log('read file: '+escape(f.name)+' ('+(f.type || 'n/a')+') - '+
	                  f.size+' bytes, last modified: '+
	                  (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a'));
	    
	    var name = f.name;
	    // remove extension
	    var ix = name.lastIndexOf('.');
	    if (ix>0)
	    	name = name.substr(0,ix);
	    // remove (..) added by browser on save
	    ix = name.lastIndexOf('(');
	    if (ix>0)
	    	name = name.substr(0,ix).trim();
	    $('#filenameText').val(name);
	    
	    var reader = new FileReader();
	    reader.onload = function(evt) {
	        // Render thumbnail.
	        console.log('file read: '+evt.target.result);
	        var jstate;
	        try {
	        	jstate = JSON.parse(evt.target.result);
	        }
	        catch (err) {
	        	console.log('error parsing JSON state: '+err.message);
	        }
        	restoreState(jstate);
	    };
	
	    // Read in the file
	    reader.readAsText(f);
	}
	else
		console.log('sorry, file apis not supported');
}

// GUI entry point
function onShowIndex() {
	// TODO
}


// GUI entry point
function onShowSequences() {
	// TODO
}

// GUI entry point 
function onObjectFilterChanges() {
	// TODO
}

//Only executed our code once the DOM is ready.
$(document).ready(function() {

	// setup paperjs
	paper.setup();
	// TODO
	
	// set-up more GUI callbacks
	$('#loadFile').on('change', onLoad);
	
	sketchbook = new Sketchbook();
});
