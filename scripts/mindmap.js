var NODE_NORMAL_SIZE = 40;
var NODE_EXPANDED_SIZE = 60;
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 600;
var DEFAULT_LOADED_STRING = "";

var DEBUG = true;

$(document).ready(function() {

    // Initialization

    var R = Raphael("canvas", CANVAS_WIDTH, CANVAS_HEIGHT),
        currentMindmap = new Mindmap(),
        root = currentMindmap, // a reference to the top-level mind map
        currentLevel = 0; // current depth of the mind map

    // Initialize breadcrumb

    var button = $("<button>root</button>");
    button.get(0).level = currentLevel++;
    button.click(breadcrumbHandler);
    $("#breadcrumb").append(button);

    function breadcrumbHandler () {
        var depth = currentLevel - this.level - 1;
        for (var i=0; i<depth; i++) {
            upALevel();
        }
    }

    // Node creation

    $("#canvas").dblclick(function (e) {
        if (e.target.nodeName == "svg") {
            // This will only trigger if the actual canvas area is clicked,
            // not any other drawn elements
            var clientXRel = e.pageX- $(this).offset().left;
            var clientYRel = e.pageY - $(this).offset().top;
            currentMindmap.newNode(clientXRel, clientYRel);
        }
    });

    // Node selection

    $("#canvas").click(function (e) {
        if (currentMindmap.selected && e.target.nodeName !== "circle") {
            // Only triggers when clicking outside circles
            currentMindmap.deselect();
        }
    });

    // Node linking

    var linkActivated = false; // controls whether linking functionality is active

    $("#linkBtn").click(function () {
        linkActivated = !linkActivated;
        $("#linkBtn").html(linkActivated ? "stop linking" : "link");
    });

    var linkDragStart, linkDragMove, linkDragEnd;
    (function () {
        var pathObject,
            x, y,
            firstNode, secondNode;

        function start () {

            x = this.attr("cx");
            y = this.attr("cy");

            firstNode = this.Node;
            // cosmetics for first node

            pathObject = R.path("M " + x + "," + y + " L " + x + "," + y + " Z");
            pathObject.toBack();
        }
        function move (dx, dy) {

            var pathArray = pathObject.attr('path');

            pathArray[1][1] = clamp(x + dx, 0, CANVAS_WIDTH);
            pathArray[1][2] = clamp(y + dy, 0, CANVAS_HEIGHT);

            pathObject.attr({path: pathArray});

            for (var i=0; i<currentMindmap.nodes.length; i++) {
                if (currentMindmap.nodes[i] !== firstNode) {
                    if (distance(x+dx, y+dy, currentMindmap.nodes[i].circle.attr("cx"), currentMindmap.nodes[i].circle.attr("cy")) < NODE_NORMAL_SIZE) {
                        secondNode = currentMindmap.nodes[i];
                        // animate the second node
                        break;
                    }
                }
            }

        }
        function end () {

            // revert both first and second node

            if (secondNode) {
                firstNode.linkTo(secondNode);
            }
            secondNode = null;
            pathObject.remove();
        }
        linkDragStart = start;
        linkDragMove = move;
        linkDragEnd = end;
    })();

    // Cutting links

    (function () {
        var dragging = false;
        var pathObject = null;
        var cut = false;

        $("#cutBtn").click(function () {
            cut = !cut;
            $("#cutBtn").html(cut ? "stop cutting" : "cut");
        });

        var canvas = $("#canvas");
        canvas.mousedown(function (e) {

            if (pathObject) {
                // deal with leftover artifacts in chrome
                // (chrome has this annoying quirk with selections
                // which can only be avoided by clicking the canvas
                // at least once)
                pathObject.remove();
            }

            if (!cut) return;

            // only triggers on canvas, not on nodes
            if (e.target.nodeName === "svg") {
                dragging = true;

                var clientXRel = e.pageX- $(this).offset().left;
                var clientYRel = e.pageY - $(this).offset().top;

                pathObject = R.path("M " + clientXRel + "," + clientYRel + " L " + (clientXRel) + "," + (clientYRel) + " Z");
            }
        });
        canvas.mousemove(function (e) {
            if (!cut) return;

            if (dragging) {

                var clientXRel = e.pageX- $(this).offset().left;
                var clientYRel = e.pageY - $(this).offset().top;

                var pathArray = pathObject.attr('path');
                pathArray[1][1] = clientXRel;
                pathArray[1][2] = clientYRel;

                pathObject.attr({path: pathArray});
            }
        });
        canvas.mouseup(function () {
            if (!cut) return;

            if (dragging) {
                dragging = false;

                var done = false;

                for (var i=0; i<currentMindmap.nodes.length; i++) {
                    for (var j=0; j<currentMindmap.nodes[i].links.length; j++) {
                        if (Raphael.pathIntersection(
                            pathObject.attr("path").toString(),
                            currentMindmap.nodes[i].links[j].attr("path").toString()
                        ).length > 0) {

                            // cut that link
                            currentMindmap.nodes[i].unlinkFrom(
                                currentMindmap.nodes[i].linkToOtherNode[currentMindmap.nodes[i].links[j].id]
                            );
                            done = true;
                            break;
                        }
                    }
                    if (done) break;
                }
            }

            if (pathObject) {
                pathObject.remove();
                pathObject = null;
            }
        });
    })();

    // Node deletion

    $("#delBtn").click(function () {
        if (currentMindmap.selected) {
            currentMindmap.remove(currentMindmap.selected);
            currentMindmap.selected.remove();
            currentMindmap.deselect();
        }
        else {
            // alert("please select a node to delete first");
        }
    });

    // Going up a level

    $("#upBtn").click(upALevel);
    function upALevel () {
        if (currentMindmap.parent) {
            currentLevel--;
            currentMindmap.clear();
            currentMindmap.parent.draw();
            currentMindmap = currentMindmap.parent;
            $("#breadcrumb button").last().remove();
        } else {
            // alert("top level reached already")
        }
    }

    // Save

    $("#saveBtn").click(function () {

        var abstractMap = {
            nodes: []
        };

        // This function creates an abstract representation of the mindmap
        // by mutating abstractMap with the contents of rootMap
        function save (map, abstractMap) {

            // base case
            if (map === null) return;

            // For each node in the map,
            _.forEach(map.nodes, function (node) {

                // Add a represenation of it to the abstract map
                var abstractNode = {
                    title: node.title,
                    desc: node.text,
                    x: Math.floor(node.circle.attr("cx")),
                    y: Math.floor(node.circle.attr("cy")),
                    childmap: {
                        nodes: []
                    }
                };
                abstractMap.nodes.push(abstractNode);

                // TODO: save links, ids (for linking)

                // Recursively build each of the child maps that was just created
                save(node.childMindmap, abstractNode.childmap);

            });
        }

        save(root, abstractMap);

        console.log(JSON.stringify(abstractMap));

    });

    // Load

    $("#loadBtn").click(function () {
        var input = prompt("warning: this will clear your current mind map", DEFAULT_LOADED_STRING);
        if (input === null) return; // dialog cancelled

        try {
            input = JSON.parse(input);
        }
        catch (e) {
            console.log("Failed to parse JSON data");
            return;
        }

        // Dispose of current mind map
        currentMindmap.nodes.forEach(function (node) {
            node.remove();
        });
        currentMindmap.nodes = [];

        // This function generates the contents of currentMap
        // from abstractMap
        function load (currentMap, abstractMap) {
            abstractMap.nodes.forEach(function (abstractNode) {
                var node = currentMap.newNode(0, 0);
                node.setText(abstractNode.text);
                node.setTitle(abstractNode.title);
                node.setPosition(abstractNode.x, abstractNode.y);
                // TODO: restore id and links

                if (abstractNode.childmap.nodes.length > 0) {
                    node.childMindmap = new Mindmap();
                    load(node.childMindmap, abstractNode.childmap);
                    node.childMindmap.clear();
                }
            });
        }

        load(currentMindmap, input);
        console.log("Mind map successfully loaded");
    });

    // Layout

    $("#gridLayoutBtn").click(function () {
        var maxNodesX = Math.floor(CANVAS_WIDTH / NODE_NORMAL_SIZE),
            maxNodesY = Math.floor(CANVAS_HEIGHT / NODE_NORMAL_SIZE);

        var buffer = 40 + NODE_NORMAL_SIZE * 2,
            r = 40 + NODE_NORMAL_SIZE,
            c = 40 + NODE_NORMAL_SIZE;

        currentMindmap.nodes.forEach(function (node) {
            node.setPosition(c, r);
            node.updateLinkPositions();
            c += buffer; // position of next node
            if (c + NODE_NORMAL_SIZE > CANVAS_WIDTH) {
                c = 40 + NODE_NORMAL_SIZE;
                r += buffer;
            }
        });
    });

    // Text fields

    $("#titlefield").bind("input propertychange", function() {
        if (currentMindmap.selected) {
            currentMindmap.selected.setTitle($("#titlefield").val());
        }
    });

    $("#infopanel").bind("input propertychange", function() {
        if (currentMindmap.selected) {
            currentMindmap.selected.setText($("#infopanel").val());
        }
    });

    // View
    // A singleton because there's really only one view

    var View = {
        update: function () {
            var titlefield = $("#titlefield"),
                infopanel = $("#infopanel");

            if (currentMindmap.selected === null) {
                titlefield.val("");
                infopanel.val("");
                titlefield.prop('disabled', true);
                infopanel.prop('disabled', true);
            }
            else {
                titlefield.prop('disabled', false);
                infopanel.prop('disabled', false);
                titlefield.val(currentMindmap.selected.title);
                infopanel.val(currentMindmap.selected.text);
                titlefield.focus();
            }
        }
    };

    View.update();

    // Model classes

    function Mindmap (parent) {
        this.nodes = [];
        this.selected = null;
        this.parent = parent || null;
    }
    Mindmap.prototype.newNode = function(x, y) {
        var nodeColours = ["#F56545", "#FFBB22", "#EEEE22", "#BBE535", "#77DDBB", "#66CCDD", "#B5C5C5"],
            outlineColours = ["#800000", "#FF8000", "#D9D900", "#008000", "#0000FF", "#000080", "#5C7676"];

        if (!Mindmap.prototype.newNode.index) {
            // ^ A namespaced property for cycling node colours,
            // nothing really important
            Mindmap.prototype.newNode.index = 0;
        }
        Mindmap.prototype.newNode.index++;

        // Cycle the colours of new nodes
        var n = new Node(x, y, NODE_NORMAL_SIZE, {
            fill: nodeColours[Mindmap.prototype.newNode.index % nodeColours.length],
            cursor: "move",
            stroke: outlineColours[Mindmap.prototype.newNode.index % nodeColours.length]
        });
        this.nodes.push(n);
        n.parentMindmap = this;

        return n;
    };
    Mindmap.prototype.clear = function() {
        this.nodes.forEach(function (node) {
            node.hide();
        });
    };
    Mindmap.prototype.draw = function() {
        this.nodes.forEach(function (node) {
            node.show();
        });
    };
    Mindmap.prototype.add = function(node) {
        this.nodes.push(node);
        node.parentMindmap = this;
    };
    Mindmap.prototype.remove = function(node) {
        this.nodes.splice(this.nodes.indexOf(node), 1);
        node.parentMindmap = null;
    };
    Mindmap.prototype.deselect = function() {
        if (this.selected) {
            // this.selected.circle.attr({fill: "#0000FF"});
            this.selected.circle.attr({"stroke-width": 0});
            this.selected = null;
            View.update();
        }
    };
    Mindmap.prototype.select = function(node) {
        this.selected = node;
        node.circle.attr({"stroke-width": 5});
        // node.circle.attr({fill: "#FF0000"});

        node.circle.toFront();
        node.label.toFront();

        View.update();
    };

    Node.index = 0; // Internal node index
    function Node(x, y, radius, options) {
        options = options || {};
        this.circle = R.circle(x, y, radius).attr({
            fill: options.fill || "#0000FF",
            stroke: options.stroke || "#000000",
            "stroke-width": options["stroke-width"] || 0,
            opacity: 1,
            cursor: options.cursor || "default"
        });

        // References to related nodes

        this.linked = []; // The nodes this node is linked to
        this.links = []; // The links (paths) used to link this node to others
        this.linkToOtherNode = {}; // Double maps to avoid O(n) operations
        this.otherNodeToLink = {};

        this.children = []; // 'Child' nodes; nodes 'inside' this one
        this.parentMindmap = currentMindmap;
        this.parent = null; // The 'parent' this node is 'inside'
        this.childMindmap = null;

        this.circle.Node = this; // A reference to this wrapper object
        this.id = Node.index++;
        var that = this; // Lexical reference

        // SVG elements

        this.title = DEBUG ? this.id.toString() : "";
        this.text = "";

        this.label = R.text(x, y - this.circle.attr("r") - 15, this.title);
        this.setTitle(this.title)

        // For use in drag handlers

        this.beingDragged = false;
        var draggedOver = null;

        function dragStart() {
            if (linkActivated) {
                // Divert control to link handler instead;
                // same goes for other handlers
                linkDragStart.bind(this)();
                return;
            }
            // Store original coordinates
            // (dx, dy in dragMove are relative to these)
            this.ox = this.attr("cx");
            this.oy = this.attr("cy");
            this.Node.beingDragged = true;
        }

        function dragMove(dx, dy) {
            if (linkActivated) {
                linkDragMove.bind(this)(dx, dy);
                return;
            }

            var newx = clamp(this.ox + dx, 0, CANVAS_WIDTH),
                newy = clamp(this.oy + dy, 0, CANVAS_HEIGHT);

            this.Node.setPosition(newx, newy);
            this.Node.updateLinkPositions();

            function collision (c1, c2) {
                return distance(c1.attr("cx"), c1.attr("cy"), c2.attr("cx"), c2.attr("cy")) < NODE_NORMAL_SIZE
            }

            if (draggedOver !== null) {
                // If there is already a drop candidate,
                if (collision(draggedOver.circle, that.circle)) {
                    // we're still colliding with the same node;
                    // no change to draggedOver
                } else {
                    draggedOver.circle.animate({r: NODE_NORMAL_SIZE}, 300, ">");
                    // draggedOver.circle.attr({fill: "#0000FF"});
                    draggedOver = null;
                }
            }
            else {
                // Check if any other nodes are new candidates for a drop
                for (var i=0; i<currentMindmap.nodes.length; i++) {
                    if (currentMindmap.nodes[i] !== that.circle.Node) {
                        if (collision(that.circle, currentMindmap.nodes[i].circle)) {
                            // if so, highlight that candicate and drop all others
                            currentMindmap.nodes[i].circle.animate({r: NODE_EXPANDED_SIZE}, 300, ">");
                            draggedOver = currentMindmap.nodes[i];
                            // currentMindmap.nodes[i].circle.attr({fill: "#FFFF00"});
                            break;
                        }
                    }
                }
            }
        }

        function dragEnd() {
            if (linkActivated) {
                linkDragEnd.bind(this)();
                return;
            }

            this.Node.beingDragged = false;

            if (draggedOver !== null) {
                // Parent the current node to the node that was dragged over

                if (this.Node.isLinkedTo(draggedOver)) {
                    // alert("these two nodes are linked; one can't be made a parent of the other unless the link is removed");
                }
                else if (this.Node.linked.length > 0) {
                    // alert("this node is linked to another node; it can't be dragged into another node (for now)");
                }
                else {
                    draggedOver.children.push(this.Node);
                    this.Node.parent = draggedOver;

                    // Create the new mind map if it doesn't yet exist
                    if (!draggedOver.childMindmap) {
                        draggedOver.childMindmap = new Mindmap(currentMindmap);
                    } else {
                        draggedOver.childMindmap.parent = currentMindmap;
                    }

                    currentMindmap.remove(this.Node);
                    this.Node.hide();
                    draggedOver.childMindmap.add(this.Node);
                }

                // draggedOver.circle.attr({fill: "#0000FF"});
                draggedOver.circle.animate({r: NODE_NORMAL_SIZE}, 300, ">");
                draggedOver = null;
            }
        }

        this.circle.drag(dragMove, dragStart, dragEnd);
        this.circle.mousedown(function (ev, x, y) {
            // if (ev.ctrlKey) {
            //     alert('ctrl key pressed');
            // }

            currentMindmap.deselect();
            currentMindmap.select(that.circle.Node);
        });

        this.circle.dblclick(function (e) {

            // Going into the double-clicked node
            // Create the new mind map if it doesn't yet exist

            if (!this.Node.childMindmap) {
                this.Node.childMindmap = new Mindmap(currentMindmap);
            }
            else {
                this.Node.childMindmap.parent = currentMindmap;
            }

            currentMindmap.deselect();
            currentMindmap.clear();
            currentMindmap = this.Node.childMindmap;
            this.Node.childMindmap.draw();

            // Update breadcrumb

            var name = this.Node.title.trim() === "" ? "untitled node" : this.Node.title;
            var button = $("<button>" + name + "</button>");
            button.get(0).level = currentLevel++;
            button.click(breadcrumbHandler);
            $("#breadcrumb").append(button);
        });
    }

    Node.prototype.setTitle = function(title) {
        this.title = title;
        this.label.attr({text: title});
        this.circle.attr({title: title}); // tooltip
    };

    Node.prototype.setText = function(text) {
        this.text = text;
    };

    Node.prototype.setPosition = function(x, y) {
        this.circle.attr({cx: x, cy: y});
        var radius = this.circle.attr("r");
        this.label.attr({
            x: x,
            y: y - radius - 15
        });
    };

    Node.prototype.updateLinkPositions = function() {
        for (var i=0; i<this.linked.length; i++) {
            var path = this.links[i];
            var pathArray = path.attr('path');

            pathArray[0][1] = this.circle.attr("cx"); // modifying the lineTo coordinates
            pathArray[0][2] = this.circle.attr("cy");
            pathArray[1][1] = this.linked[i].circle.attr('cx'); 
            pathArray[1][2] = this.linked[i].circle.attr('cy');

            path.attr({path: pathArray});
        }
    };

    Node.prototype.linkTo = function(otherNode) {
        if (this.isLinkedTo(otherNode) ||
            this === otherNode) {
            return;
        }

        // link to each other
        this.linked.push(otherNode);
        otherNode.linked.push(this);

        // create path
        var path = R.path("M " + this.circle.attr('cx') + "," + this.circle.attr('cy') + " L " + otherNode.circle.attr('cx') + "," + otherNode.circle.attr('cy') + " Z");
        // path.attr({stroke:'#FF0000', 'stroke-width': 2 ,'arrow-end': 'classic-wide-long'});
        // path.toFront();
        path.toBack();

        this.links.push(path);
        otherNode.links.push(path);

        this.linkToOtherNode[path.id] = otherNode;
        this.otherNodeToLink[otherNode.id] = path;

        otherNode.linkToOtherNode[path.id] = this;
        otherNode.otherNodeToLink[this.id] = path;
    };

    Node.prototype.unlinkFrom = function(otherNode) {
        // remove link references
        this.linked.splice(this.linked.indexOf(otherNode), 1);
        otherNode.linked.splice(otherNode.linked.indexOf(this), 1);

        // remove the path object that serves as the link
        var link = this.otherNodeToLink[otherNode.id];

        // remove it from either object's links
        this.links.splice(this.links.indexOf(link), 1);
        otherNode.links.splice(otherNode.links.indexOf(link), 1);

        // remove it from both link maps
        this.otherNodeToLink[otherNode.id] = null;
        this.linkToOtherNode[link.id] = null;
        otherNode.otherNodeToLink[this.id] = null;
        otherNode.linkToOtherNode[link.id] = null;

        link.remove();
    };

    Node.prototype.isLinkedTo = function(otherNode) {
        // check for a bi-directional link (directed not yet implemented)
        return this.linked.indexOf(otherNode) >= 0 && otherNode.linked.indexOf(this) >= 0;
    };
    Node.prototype.hide = function() {
        this.circle.hide();
        this.label.hide();
        this.links.forEach(function (link) {
            link.hide();
        });
    };
    Node.prototype.show = function() {
        this.circle.show();
        this.label.show();
        this.links.forEach(function (link) {
            link.show();
        });
    };
    Node.prototype.remove = function() {
        this.circle.remove();
        this.label.remove();

        var that = this;
        _.clone(this.linked).forEach(function (linkedTo) {
            that.unlinkFrom(linkedTo);
        });
        this.children.forEach(function (child) {
            child.remove();
        });
    };
});

// Random utility functions

function distance (x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}

function random (lower, upper) {
    return Math.floor(Math.random() * (upper-lower) + lower);
}

function clamp (n, min, max) {
    return Math.max(Math.min(n, max), min);
}
