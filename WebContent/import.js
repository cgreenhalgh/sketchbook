// try to import a prezi content.xml file
function loadPrezi(text) {
	var xml = null;
	if (window.DOMParser)
	{
		var parser=new DOMParser();
		xml=parser.parseFromString(text,"text/xml");
	}
	else // Internet Explorer
	{
		xml=new ActiveXObject("Microsoft.XMLDOM");
		xml.async=false;
		xml.loadXML(text); 
	}
	//dumpXml(xml);
	var nextId = 1;
	var sketch = {id:nextId++, description:'Prezi import',elements:[]};
	//<zuiprezi>
	//  <version>5</version>
	//  <zui-table>...
	var zuipreziel = getFirstElement(xml, 'zuiprezi');
	var versionel = getFirstElement(zuipreziel, 'version');
	var version = versionel.textContent;
	if (version!='5') {
		console.log('Warning: different version from testing: '+version+' (tested with 5)');
	}
	var zuitableel = getFirstElement(zuipreziel, 'zui-table');
	// <zui-table>
	//   <settings>...
	//   <object>
	//   ...
	// Each object...
	var objectels = zuitableel.childNodes;
	for (var ci=0; ci<objectels.length; ci++) {
		var objectel = objectels[ci];
		if (objectel.nodeType!=ELEMENT_NODE || objectel.nodeName!='object')
			continue;
		// <object x=Number y=Number class=body|backet|cicle|invisible|poly5|? s=N r=0 type=button|label id=N>
		var x = objectel.getAttribute('x');
		if (x!==null)
			x = Number(x);
		var y = objectel.getAttribute('y');
		if (y!==null)
			y = Number(y);
		var s = objectel.getAttribute('s');
		if (s!==null)
			s = Number(s);
		var cl = objectel.getAttribute('class');
		// [class=bracket]
		//    <type>bracket
		//    <size>
		//       <w>N <h>N
		if (cl=='body') {
			var childel = getFirstElementOpt(objectel);
			// [class=body type=label]
			//    <textfield autoSize=true[else w/h] >
			//       <x>N <y>N 
			//       <text> <![CDATA[...]]>
			//       <w>N <h>N [opt]
			//       <annotations>r0-21|r0-12|r0-16 { align: center|left; }
			//                     ^ character span (of paragraphs, i think)
			if (childel.nodeName=='textfield') {
				var textel = getFirstElementOpt(childel, 'text');
				if (!textel) {
					console.log('no text in textfield');
					continue;
				}
				var text = textel.textContent;
				var xel = getFirstElementOpt(childel, 'x');
				if (xel)
					x += Number(xel.textContent);
				var yel = getFirstElementOpt(childel, 'y');
				if (yel)
					y += Number(yel.textContent);
				var annotationsel = getFirstElementOpt(childel, 'annotations');
				console.log('text at '+x+','+y+' ('+annotationsel.textContent+'): '+text);
				
				// TODO style
				var stext = { content: text, x: x, y: y, textColor: { red: 0, green: 0, blue: 0 }, textSize: 16*s };
				var sitem = { id: nextId++, text: stext };
				sketch.elements.push(sitem);
			}
		}
		else if (cl=='circle') {
			// <type>circle
			// <size>
			//    <w>N <h>N
			var sizeel = getFirstElementOpt(objectel, 'size');
			if (sizeel) {
				var w = s*Number(getFirstElement(sizeel,'w').textContent);
				var h = s*Number(getFirstElement(sizeel,'h').textContent);
				var sline = { lineColor: { red: 0, green: 0, blue: 0 }, fillColor: { red: 0.5, green: 0.5, blue: 0.5 }, lineWidth: s*10, frameStyle: 'border,fill', segments: [] };
				var hr = 16.568542494923804/60;
				console.log('cicle '+w+'x'+h+' at '+x+','+y+', size '+s);
//[{"point":{"x":120,"y":150},"handleIn":{"x":0,"y":16.568542494923804},"handleOut":{"x":0,"y":-16.568542494923804}},{"point":{"x":150,"y":120},"handleIn":{"x":-16.568542494923804,"y":0},"handleOut":{"x":16.568542494923804,"y":0}},{"point":{"x":180,"y":150},"handleIn":{"x":0,"y":-16.568542494923804},"handleOut":{"x":0,"y":16.568542494923804}},{"point":{"x":150,"y":180},"handleIn":{"x":16.568542494923804,"y":0},"handleOut":{"x":-16.568542494923804,"y":0}},{"point":{"x":120,"y":150},"handleIn":{"x":0,"y":16.568542494923804},"handleOut":{"x":0,"y":-16.568542494923804}}]
				sline.segments.push({point:{x:x-w/2, y:y}, handleIn:{x:0,y:hr*h}, handleOut:{x:0,y:-hr*h}});
				sline.segments.push({point:{x:x, y:y-h/2}, handleIn:{x:-hr*w,y:0}, handleOut:{x:hr*w,y:0}});
				sline.segments.push({point:{x:x+w/2, y:y}, handleIn:{x:0,y:-hr*h}, handleOut:{x:0,y:hr*h}});
				sline.segments.push({point:{x:x, y:y+h/2}, handleIn:{x:hr*w,y:0}, handleOut:{x:-hr*w,y:0}});
				var sitem = {id: nextId++, line: sline };
				sketch.elements.push(sitem);
			}
		}
	}
	var jstate = {version: VERSION, nextId: nextId, sketches:[ sketch ]};
	console.log('sketch: '+JSON.stringify(jstate));
	return jstate;
}
var ELEMENT_NODE = 1;
function getFirstElement(node, name) {
	var child = getFirstElementOpt(node, name);
	if (!child)
		throw "No child element ("+name+") in "+node.nodeName;
	return child;
}
function getFirstElementOpt(node, name) {
	var children = node.childNodes;
	for (var ci=0; ci<children.length; ci++) {
		var child = children[ci];
		if (child.nodeType==ELEMENT_NODE && (!name || name==child.nodeName))
			return child;
	}
	return null;
}
function dumpXml(node, level) {
	if (!level)
		level = 1;
	else
		level++;
	var pad = '';
	for (var i=0; i<level; i++)
		pad += '  ';
	console.log(pad+'node type='+node.nodeType+' name='+node.nodeName+' value='+node.nodeValue);
	var children = node.childNodes;
	for (var ci=0; ci<children.length; ci++)
		dumpXml(children[ci], level);
}