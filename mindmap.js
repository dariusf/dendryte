$(document).ready(function() {

    var R = Raphael("canvas", 800, 600);
    var currentMindmap = new Mindmap();
    var currentLevel = 0;

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
        var colours = ["#0000FF"],//, "#00FF00", "#FF0000"],
            index = 0;

        var n = new Node(x, y, /*random(20, 40)*/40, {fill: colours[index++ % 3], cursor: "move"});
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
    };
    Mindmap.prototype.remove = function(node) {
        this.nodes.splice(this.nodes.indexOf(node), 1);
    };
    Mindmap.prototype.deselect = function() {
        // change back to default colour
        if (this.selected) {
            // this.selected.circle.attr({fill: "#0000FF"});
            this.selected.circle.attr({"stroke-width": 0});
            this.selected = null;
        }
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
            stroke: "#000000",
            "stroke-width": options["stroke-width"] || 0,
            opacity: options.opacity || 1, // was .5
            cursor: options.cursor || "default"
        });
        this.linked = [];
        this.links = [];
        this.children = [];
        this.parent = null;
        this.circle.Node = this; // reference to wrapper object
        this.beingDragged = false;
        this.draggedOver = null;
        this.index = Node.index++;
        this.title = "";
        this.parentMindmap = currentMindmap;
        this.childMindmap = null;

        var title = this.title;
        this.circle.attr({title: title});
        this.label = R.text(x, y - this.circle.attr("r") - 15, title);

        var that = this;
        var draggedOver = null;
        var originalRadius = 0;

        // draw a line between this node and all linked nodes

        function dragStart() {
            // store original coordinates
            this.ox = this.attr("cx");
            this.oy = this.attr("cy");
            this.attr({opacity: 1});
            this.Node.beingDragged = true;
        }

        function dragMove(dx, dy) {
            var newx = this.ox + dx,
                newy = this.oy + dy;

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
                return distance(c1.attr("cx"), c1.attr("cy"), c2.attr("cx"), c2.attr("cy")) < 50
            }

            if (draggedOver !== null) {
                // there is already a drop candidate
                if (collision(draggedOver.circle, that.circle)) {
                    // no change to draggedOver
                } else {
                    // use fixed sizes intead of relative
                    // draggedOver.circle.animate({r: originalRadius}, 50, ">");
                    originalRadius = 0;
                    draggedOver.circle.attr({fill: "#0000FF"});
                    draggedOver = null;
                }
            }
            else {
                // check if any other nodes are new candidates for a drop
                for (var i=0; i<currentMindmap.nodes.length; i++) {
                    if (currentMindmap.nodes[i] !== that.circle.Node) {
                        if (collision(that.circle, currentMindmap.nodes[i].circle)) {
                            // if so, highlight and drop all other candidates
                            currentMindmap.nodes[i].circle.attr({fill: "#FFFF00"});
                            originalRadius = currentMindmap.nodes[i].circle.attr("r");
                            // nodes[i].circle.animate({r: originalRadius*2}, 50, ">");
                            draggedOver = currentMindmap.nodes[i];
                            break;
                        }
                    }
                }
            }
        }
        function dragEnd() {
            this.attr({opacity: 1}); //.5
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

                    currentMindmap.remove(this.Node);
                    this.Node.hide();
                    draggedOver.childMindmap.add(this.Node);
                }

                draggedOver.circle.attr({fill: "#0000FF"});
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
                currentMindmap.selected.linkTo(that.circle.Node);
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

// Debug

function printObject (obj) {
    console.log(obj);
    for (var prop in obj) {
        console.log("    " + prop);
    }
}