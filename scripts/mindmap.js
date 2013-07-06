var NODE_NORMAL_SIZE = 40;
var NODE_EXPANDED_SIZE = 60;
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 600;

var DEBUG = false;

$(document).ready(function() {

    var R = Raphael("canvas", CANVAS_WIDTH, CANVAS_HEIGHT);
    var app = {};
    var currentMindmap = new Mindmap();
    var root = currentMindmap;
    var currentLevel = 0;

    var linkActivated = false;

    // root button
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

    $("#canvas").dblclick(function (e) {
        if (e.target.nodeName == "svg") {
            //This will only occur if the actual canvas area is clicked, not any other drawn elements
            var clientXRel = e.pageX- $(this).offset().left;
            var clientYRel = e.pageY - $(this).offset().top;
            currentMindmap.newNode(clientXRel, clientYRel);
        }
    });

    $("#canvas").click(function (e) {
        if (currentMindmap.selected && e.target.nodeName !== "circle") {
            currentMindmap.deselect();
        }
    });

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

    // define handlers for cut button
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
                                currentMindmap.nodes[i].linkMap[currentMindmap.nodes[i].links[j].id]);
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

    // $("#oldLinkBtn").click(function () {
    //     if (currentMindmap.selected) {
    //         currentMindmap.linking = true;
    //     }
    //     else {
    //         alert("please select a node, click link, then click a second node")
    //     }
    // });

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

    $("#upBtn").click(upALevel);
    function upALevel () {
        if (currentMindmap.parent) {
            currentLevel--;
            currentMindmap.clear();
            currentMindmap.parent.draw();
            currentMindmap = currentMindmap.parent;
            $("#breadcrumb button").last().remove();
        } else {
            alert("top level reached already")
        }
    }

    $("#saveBtn").click(function () {

        var abstractMap = {
            nodes: []
        };

        // This function creates an abstract representation of the mindmap
        // by mutating abstractMap with the contents of rootMap
        function save (map, abstractMap) {

            // base case
            if (map === null) return;

            // for each node in the map,
            _.forEach(map.nodes, function (node) {

                // add an abstract represenation of it to the abstract map
                var abstractNode = {
                    title: node.title,
                    desc: node.text,
                    childmap: {
                        nodes: []
                    }
                };
                abstractMap.nodes.push(abstractNode);

                // save links, ids (for linking), and location
                
                // recursively build each child map that was just created
                save(node.childMindmap, abstractNode.childmap);

            });
        }

        save(root, abstractMap);

        console.log(JSON.stringify(abstractMap));

    });

    $("#loadBtn").click(function () {
        var input = prompt("warning: this will clear your current mind map", "json to load");

        try {
            input = JSON.parse(input);
        }
        catch (e) {
            console.log("Failed to parse JSON data");
            return;
        }

        // save backup

        // $("#saveBtn").click();

        // delete current mind map

        currentMindmap.nodes.forEach(function (node) {
            node.remove();
        });
        // console.log(currentMindmap.toSource());

        // This function generates the contents of currentMap
        // from abstractMap
        function load (currentMap, abstractMap) {
            abstractMap.nodes.forEach(function (abstractNode) {
                var node = currentMap.newNode(0, 0);
                node.setText(abstractNode.text);
                node.setTitle(abstractNode.title);
                // restore id, links too

                if (abstractNode.childmap.nodes.length > 0) {
                    node.childMindmap = new Mindmap();
                    load(node.childMindmap, abstractNode.childmap);
                    node.childMindmap.clear();
                }
            });
        }

        load(currentMindmap, input);
    });

    $("#gridLayoutBtn").click(function () {
        var maxNodesX = Math.floor(CANVAS_WIDTH / NODE_NORMAL_SIZE),
            maxNodesY = Math.floor(CANVAS_HEIGHT / NODE_NORMAL_SIZE);

        var buffer = 40 + NODE_NORMAL_SIZE * 2,
            r = 40 + NODE_NORMAL_SIZE,
            c = 40 + NODE_NORMAL_SIZE;

        currentMindmap.nodes.forEach(function (node) {
            node.setPosition(c, r);
            c += buffer; // position of next node
            if (c + NODE_NORMAL_SIZE > CANVAS_WIDTH) {
                c = 40 + NODE_NORMAL_SIZE;
                r += buffer;
            }
        });
    });

    // text fields

    $("#infopanel").bind("input propertychange", function() {
        if (currentMindmap.selected) {
            currentMindmap.selected.setText($("#infopanel").val());
        }
    });

    $("#titlefield").bind("input propertychange", function() {
        if (currentMindmap.selected) {
            currentMindmap.selected.setTitle($("#titlefield").val());
        }
    });

    // view
    // a simple DRY abstraction
    // can be a singleton because there's really only one view

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

    // model classes

    function Mindmap (parent) {
        this.nodes = [];
        this.selected = null;
        this.parent = parent || null;
        // this.linking = false;
    }
    Mindmap.prototype.newNode = function(x, y) {
        var nodeColours = ["#0000FF", "#00FF00", "#FF0000"],
            outlineColours = ["#000080", "#008000", "#800000"];

        if (!Mindmap.prototype.newNode.index) {
            // a namespaced property for cycling node colours,
            // nothing important
            Mindmap.prototype.newNode.index = 0;
        }
        Mindmap.prototype.newNode.index++;

        var n = new Node(x, y, NODE_NORMAL_SIZE, {
            fill: nodeColours[Mindmap.prototype.newNode.index % 3],
            cursor: "move",
            stroke: outlineColours[Mindmap.prototype.newNode.index % 3]
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
        // change back to default colour
        if (this.selected) {
            // this.selected.circle.attr({fill: "#0000FF"});
            this.selected.circle.attr({"stroke-width": 0});
            this.selected = null;
            View.update();
        }
        // this.linking = false;
    };
    Mindmap.prototype.select = function(node) {
        this.selected = node;
        node.circle.attr({"stroke-width": 5});

        node.circle.toFront();
        node.label.toFront();

        View.update();
        // node.circle.attr({fill: "#FF0000"});
    };

    // Node.index = 0;
    function Node(x, y, radius, options) {
        options = options || {};
        this.circle = R.circle(x, y, radius).attr({
            fill: options.fill || "#0000FF",
            stroke: options.stroke || "#000000",
            "stroke-width": options["stroke-width"] || 0,
            opacity: 1,
            cursor: options.cursor || "default"
        });
        this.linked = []; // a list of nodes this node is linked to
        this.links = []; // a list of the links (paths) used to link this node to others
        this.linkMap = {}; // maps link (path) id -> other node linked to
        // possibly need a bimap for the above

        this.children = []; // a list of 'child' nodes (nodes 'inside' this one)
        this.parent = null;
        this.parentMindmap = currentMindmap;
        this.childMindmap = null;

        this.circle.Node = this; // a reference to this wrapper object
        this.beingDragged = false;
        // this.draggedOver = null;
        // this.index = Node.index++; // not really needed, can use this.circle.id
        this.title = DEBUG ? this.circle.id.toString() : "";
        this.text = "";

        this.label = R.text(x, y - this.circle.attr("r") - 15, this.title);
        this.setTitle(this.title)

        var that = this; // lexical reference
        var draggedOver = null;

        function dragStart() {
            if (linkActivated) {
                linkDragStart.bind(this)();
                return;
            }
            // store original coordinates
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

            // update all links for this node
            var linked = this.Node.linked,
                links = this.Node.links;

            for (var i=0; i<linked.length; i++) {
                var path = links[i];
                var pathArray = path.attr('path');

                pathArray[0][1] = newx; // modifying the lineTo coordinates
                pathArray[0][2] = newy;
                pathArray[1][1] = linked[i].circle.attr('cx'); 
                pathArray[1][2] = linked[i].circle.attr('cy');

                path.attr({path: pathArray});
            }

            // handle drag collision

            function collision (c1, c2) {
                return distance(c1.attr("cx"), c1.attr("cy"), c2.attr("cx"), c2.attr("cy")) < NODE_NORMAL_SIZE
            }

            if (draggedOver !== null) {
                // there is already a drop candidate
                if (collision(draggedOver.circle, that.circle)) {
                    // no change to draggedOver
                } else {
                    draggedOver.circle.animate({r: NODE_NORMAL_SIZE}, 300, ">");
                    // draggedOver.circle.attr({fill: "#0000FF"});
                    draggedOver = null;
                }
            }
            else {
                // check if any other nodes are new candidates for a drop
                for (var i=0; i<currentMindmap.nodes.length; i++) {
                    if (currentMindmap.nodes[i] !== that.circle.Node) {
                        if (collision(that.circle, currentMindmap.nodes[i].circle)) {
                            // if so, highlight and drop all other candidates
                            // currentMindmap.nodes[i].circle.attr({fill: "#FFFF00"});
                            currentMindmap.nodes[i].circle.animate({r: NODE_EXPANDED_SIZE}, 300, ">");
                            draggedOver = currentMindmap.nodes[i];
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
                // parent the current node to the node that was dragged over

                if (this.Node.isLinkedTo(draggedOver)) {
                    alert("these two nodes are linked; one can't be made a parent of the other unless the link is removed");
                }
                else if (this.Node.linked.length > 0) {
                    alert("this node is linked to another node; it can't be dragged into another node (for now)");
                }
                else {
                    draggedOver.children.push(this.Node);
                    this.Node.parent = draggedOver;

                    if (!draggedOver.childMindmap) {
                        draggedOver.childMindmap = new Mindmap(currentMindmap);
                    }
                    else {
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

            // legacy

            // if (currentMindmap.linking) {
            //     // link
            //     currentMindmap.selected.linkTo(that.circle.Node);
            //     currentMindmap.linking = false;
            // }

            // manage selections
            currentMindmap.deselect();
            currentMindmap.select(that.circle.Node);
        });

        this.circle.dblclick(function (e) {
            // going into the double-clicked node
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
            var name = this.Node.title.trim() === "" ? "untitled node" : this.Node.title;
            var button = $("<button>" + name + "</button>");
            button.get(0).level = currentLevel++;
            button.click(breadcrumbHandler);
            $("#breadcrumb").append(button);
        });
    }

    Node.prototype.id = function() {
        return this.circle.id;
    };

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

        this.linkMap[path.id] = otherNode;
        otherNode.linkMap[path.id] = this;
    };

    Node.prototype.unlinkFrom = function(otherNode) {
        // remove link references
        this.linked.splice(this.linked.indexOf(otherNode), 1);
        otherNode.linked.splice(otherNode.linked.indexOf(this), 1);

        // remove the path object that serves as the link
        // find it with an O(n) search
        // (change later)
        var that = this;
        var path = this.links.filter(function (link) {
            return that.linkMap[link.id] === otherNode;
        })[0]; // there can be only 1 link between each distinct node pair

        // remove it from either object's links
        this.links.splice(this.links.indexOf(path), 1);
        otherNode.links.splice(otherNode.links.indexOf(path), 1);

        // remove it from either link map
        this.linkMap[path.id] = null;
        otherNode.linkMap[path.id] = null;

        path.remove();
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
        this.links.forEach(function (link) {
            // remove link from other node's list of links

            // can be done in reverse, by looping through the other linked nodes instead
            var otherNode = that.linkMap[link.id];
            otherNode.links.splice(otherNode.links.indexOf(link), 1);

            // remove this node from other node's list of linked nodes
            otherNode.linked.splice(otherNode.linked.indexOf(that), 1);
            that.linkMap[link.id] = null; // null instead of undefiend to show that it was deleted

            link.remove();
        });
        this.children.forEach(function (child) {
            child.remove();
        });
    };
});

function distance (x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}

function random (lower, upper) {
    return Math.floor(Math.random() * (upper-lower) + lower);
}

function clamp (n, min, max) {
    return Math.max(Math.min(n, max), min);
}

// Debug

function printObject (obj) {
    console.log(obj);
    for (var prop in obj) {
        console.log("    " + prop);
    }
}
