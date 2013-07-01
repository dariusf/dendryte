var NODE_NORMAL_SIZE = 40;
var NODE_EXPANDED_SIZE = 60;
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 600;
var DEBUG = false;

$(document).ready(function() {

    var R = Raphael("canvas", CANVAS_WIDTH, CANVAS_HEIGHT);
    var app = {};
    var currentMindmap = new Mindmap();
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
            $("#infopanel").val("");
            $("#titlefield").val("");
        }
    });

    $("#linkBtn").click(function () {
        linkActivated = !linkActivated;
        $("#linkBtn").html(linkActivated ? "stop linking" : "link");
        // console.log('link button');
    });
    var linkDragStart, linkDragMove, linkDragEnd;
    (function () {
        var pathObject, x, y,
            firstNode, secondNode;

        function start () {

            // var clientXRel = e.pageX- $(this).offset().left;
            // var clientYRel = e.pageY - $(this).offset().top;
            // console.log(clientXRel + ", " + clientYRel);

            // console.log(this.toSource());
            x = this.attr("cx");
            y = this.attr("cy");

            firstNode = this.Node;
            // do something to first node here

            // this.ox = x;
            // this.oy = y;

            pathObject = R.path("M " + x + "," + y + " L " + x + "," + y + " Z");
            pathObject.toBack();

            // console.log("start");
        }
        function move (dx, dy) {
            // console.log("move");

            var pathArray = pathObject.attr('path');

            // pathArray[0][1] = newx; // modifying the lineTo coordinates
            // pathArray[0][2] = newy;
            pathArray[1][1] = clamp(x + dx, 0, CANVAS_WIDTH);
            pathArray[1][2] = clamp(y + dy, 0, CANVAS_HEIGHT);

            // console.log('moving ' + pathArray[1][1] + ", " + pathArray[1][2]);

            pathObject.attr({path: pathArray});

            for (var i=0; i<currentMindmap.nodes.length; i++) {
                // console.log("node " + i + " of current map");
                if (currentMindmap.nodes[i] !== firstNode) {
                    // console.log("found a node that is not the current");
// console.log(distance(x, y, currentMindmap.nodes[i].circle.attr("cx"), currentMindmap.nodes[i].circle.attr("cy")));
                    if (distance(x+dx, y+dy, currentMindmap.nodes[i].circle.attr("cx"), currentMindmap.nodes[i].circle.attr("cy")) < NODE_NORMAL_SIZE) {
                        secondNode = currentMindmap.nodes[i];
                        // animate it
                        // console.log("yeah");
                        break;
                    }
                }
            }

        }
        function end () {
            // console.log("end");

            // revert both first and second node
            if (secondNode) {

                // REFACTOR: move the error checking into the linkto function

                if (firstNode.isLinkedTo(secondNode)) {
                    alert("those 2 nodes are already linked");
                    // should just have silent failure since alert messes with mousedown
                } else if (firstNode === secondNode) {
                    alert("you can't link a node to itself");
                } else {
                    firstNode.linkTo(secondNode);
                }
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
            // alert('cut button');
        });

        var canvas = $("#canvas"); // a div
        canvas.mousedown(function (e) {
            if (!cut) return;

            // only triggers on canvas, not on nodes
            if (e.target.nodeName === "svg") {
                dragging = true;

                // console.log("down")

                var clientXRel = e.pageX- $(this).offset().left;
                var clientYRel = e.pageY - $(this).offset().top;
                // console.log(clientXRel + ", " + clientYRel);

                pathObject = R.path("M " + clientXRel + "," + clientYRel + " L " + (clientXRel) + "," + (clientYRel) + " Z");
            }
        });
        canvas.mousemove(function (e) {
            if (!cut) return;

            if (dragging) {
            // console.log("moving")

                var clientXRel = e.pageX- $(this).offset().left;
                var clientYRel = e.pageY - $(this).offset().top;
            // console.log(clientXRel + ", " + clientYRel);

                var pathArray = pathObject.attr('path');
                // pathArray[0][1] = newx; // modifying the lineTo coordinates
                // pathArray[0][2] = newy;
                pathArray[1][1] = clientXRel;
                pathArray[1][2] = clientYRel;

                pathObject.attr({path: pathArray});

                // console.log("hi");
            }
        });
        canvas.mouseup(function () {
            if (!cut) return;

            if (dragging) {
            dragging = false;
            // console.log("up")

            var done = false;

                for (var i=0; i<currentMindmap.nodes.length; i++) {
                    // console.log("inside node " + i);
                    for (var j=0; j<currentMindmap.nodes[i].links.length; j++) {
                    // console.log("link " + j + " of node " + i);
                    // console.log(path.attr("path").toString())
                    // console.log(currentMindmap.nodes[i].links[j].attr("path"))
    // console.log(Raphael.pathIntersection(path.attr("path").toString(), currentMindmap.nodes[i].links[j].attr("path").toString()).toSource());
                        if (Raphael.pathIntersection(
                            pathObject.attr("path").toString(),
                            currentMindmap.nodes[i].links[j].attr("path").toString()
                        ).length > 0) {

                            // console.log("intersection!");

                            // cut that link
                            currentMindmap.nodes[i].unlinkFrom(
                                currentMindmap.nodes[i].linkMap[currentMindmap.nodes[i].links[j].id]);
                            // currentMindmap.nodes[i].links[j].remove();
                            done = true;
                            break;
                            // need an unlink function

                            // // remove link from other node's list of links
                            // var otherNode = that.linkMap[link.id];
                            // otherNode.links.splice(otherNode.links.indexOf(link), 1);

                            // // remove link from linked too
                            // otherNode.linked.splice(otherNode.linked.indexOf(that), 1);
                            // that.linkMap[link.id] = null; // null instead of undefiend to show that it was deleted

                            // link.remove();
                        }
                    }
                    if (done) break;
                }
            }

            pathObject.remove();
            pathObject = null;
        });
    })();

    $("#oldLinkBtn").click(function () {
        if (currentMindmap.selected) {
            currentMindmap.linking = true;
        }
        else {
            alert("please select a node, click link, then click a second node")
        }
    });

    $("#delBtn").click(function () {
        if (currentMindmap.selected) {
            currentMindmap.remove(currentMindmap.selected);
            currentMindmap.selected.remove();
            currentMindmap.deselect();
        }
        else {
            alert("please select a node to delete first");
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

    $("#infopanel").bind("input propertychange", function() {
        if (currentMindmap.selected) {
            currentMindmap.selected.text = $("#infopanel").val();
        }
    });

    $("#titlefield").bind("input propertychange", function() {
        if (currentMindmap.selected) {
            currentMindmap.selected.title = $("#titlefield").val();
            currentMindmap.selected.label.attr({text: currentMindmap.selected.title});
        }
    });

    // should also interface with the info panels
    function Mindmap (parent) {
        this.nodes = [];
        this.selected = null;
        this.parent = parent || null;
        this.linking = false;
    }
    Mindmap.prototype.newNode = function(x, y) {
        var nodeColours = ["#0000FF", "#00FF00", "#FF0000"],
            outlineColours = ["#000080", "#008000", "#800000"];

        if (!Mindmap.prototype.newNode.index) {
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
        }
        this.linking = false;
        // update the interface too once more abstractions are in place
    };
    Mindmap.prototype.select = function(node) {
        this.selected = node;
        this.selected.circle.attr({"stroke-width": 5});
        // node.circle.attr({fill: "#FF0000"});
    };

    Node.index = 0;
    function Node(x, y, radius, options) {
        options = options || {};
        this.circle = R.circle(x, y, radius).attr({
            fill: options.fill || "#0000FF",
            stroke: options.stroke || "#000000",
            "stroke-width": options["stroke-width"] || 0,
            opacity: 1,
            cursor: options.cursor || "default"
        });
        this.linked = [];
        this.links = [];
        this.linkMap = {};
        this.children = [];
        this.parent = null;
        this.circle.Node = this; // reference to wrapper object
        this.beingDragged = false;
        this.draggedOver = null;
        this.index = Node.index++; // not really needed, can use this.circle.id
        this.title = DEBUG ? this.index.toString() : "";
        this.parentMindmap = currentMindmap;
        this.childMindmap = null;

        var title = this.title;
        this.circle.attr({title: title});
        this.label = R.text(x, y - this.circle.attr("r") - 15, title);

        var that = this;
        var draggedOver = null;

        // draw a line between this node and all linked nodes

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

            this.attr({cx: newx, cy: newy});

            var radius = this.attr("r");
            
            // update text position
            this.Node.label.attr({
                x: newx,
                y: newy - radius - 15
            });

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
                    // use fixed sizes intead of relative
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
        this.circle.mousedown(function (ev, x, y) { // rename this
            // if (ev.ctrlKey) {
            //     alert('ctrl key pressed');
            // }
            // alert('click handler');

            if (currentMindmap.linking) {
                // link
                if (currentMindmap.selected.isLinkedTo(that.circle.Node)) {
                    alert("those 2 nodes are already linked");
                    // should just have silent failure since alert messes with mousedown
                } else if (currentMindmap.selected === that.circle.Node) {
                    alert("you can't link a node to itself");
                } else {
                    currentMindmap.selected.linkTo(that.circle.Node);
                }
                currentMindmap.linking = false;
            }

            // manage selections
            currentMindmap.deselect();
            currentMindmap.select(that.circle.Node);
            that.circle.toFront();

            // update fields
            $("#infopanel").val(that.circle.Node.text);
            $("#titlefield").val(that.circle.Node.title);
        });

        this.circle.dblclick(function (e) {
            // going into the double-clicked node
            if (!this.Node.childMindmap) {
                this.Node.childMindmap = new Mindmap(currentMindmap);
            }
            else {
                this.Node.childMindmap.parent = currentMindmap;
            }
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

    Node.prototype.linkTo = function(otherNode) {
        // link to each other
        this.linked.push(otherNode);
        otherNode.linked.push(this);

        // create path
        var path = R.path("M " + this.circle.attr('cx') + "," + this.circle.attr('cy') + " L " + otherNode.circle.attr('cx') + "," + otherNode.circle.attr('cy') + " Z");
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
            var otherNode = that.linkMap[link.id];
            otherNode.links.splice(otherNode.links.indexOf(link), 1);

            // remove link from linked too
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
