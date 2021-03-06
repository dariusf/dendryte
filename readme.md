Dendryte
---------

A dendrite is a tree-like structure in the human brain responsible for the transmission of electrochemical stimulation - in other words, _thought_.

Our project is a thinking tool in the same vein - a lightweight and portable web app which captures ideas in the form of mind maps.

[www.orbital-dendryte.appspot.com](http://www.orbital-dendryte.appspot.com)

### Instructions

	(Requires Google App Engine)

	git clone
	dev_appserver.py --clear_datastore=yes app.yaml

	Alternatively, open the folder with Google App Engine Launcher

### Mind Maps

- Double-click anywhere on the canvas to create a node. Nodes can hold text of any sort.
- Click on nodes to select them. Selected nodes can be dragged around, linked to others, or deleted.
- Double-click on a selected node to _enter_ it - inside each node is a space which can contain other nodes. Drop nodes into other nodes to create elaborate hierarchies. Your mind maps can be made endlessly _deep_ in this way.
- The breadcrumb helps you to find your bearings. Failing that, the `up` button gets you out of recursive tangles.

### Upcoming Features

- Node customization
- Responsive layout
- Saving and loading locally
- Exporting to various formats
- More layout options
