import urllib
import webapp2
import jinja2
import os
import logging
import datetime

from google.appengine.ext import db
from google.appengine.api import users

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__) + "/templates"))

def abovezero(gqlquery):
    return gqlquery.count() > 0
jinja_environment.tests['notempty'] = abovezero

# Database model definitions
class Person(db.Model):
    """ Models a person identified by email """
    email = db.StringProperty()
  
class MindmapDocument(db.Model):
    """ Models a mindmap with title, contents, and date """
    # id = db.IntegerProperty()
    title = db.StringProperty()
    contents = db.TextProperty()
    timestamp = db.DateTimeProperty(auto_now_add=True)

# Handlers
class Projects(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user: # check if signed in

            # check if user is in database, create if not
            parent_key = db.Key.from_path('Person', users.get_current_user().email())
            person = db.get(parent_key)
            if person == None:
                newPerson = Person(key_name=users.get_current_user().email())
                newPerson.put()

                tutorial = MindmapDocument(parent=parent_key)
                tutorial.title = "Welcome!"
                tutorial.contents = "{'nodes':[{'id':0,'title':'Start here','text':'Welcome to Dendryte!\n\nLet's walk you through the process of creating your first mind map.\n\nDouble-click on this node to continue.','x':398,'y':257,'linked':[],'childmap':{'nodes':[{'id':1,'title':'What just happened?','text':'What indeed. We just went inside the orange node!\n\nYou probably already knew that mind maps contain nodes. But did you know that nodes also contain mind maps?\n\nInside every node is enough space for all its siblings.','x':449,'y':304,'linked':[3],'childmap':{'nodes':[]}},{'id':3,'title':'Tell me more!','text':'Look over there. Pointed to by the (rather minimalistic) arrow is the breadcrumb.','x':620,'y':152,'linked':[1,4],'childmap':{'nodes':[]}},{'id':4,'title':'^','text':'It's a hierarchical list of nodes that we've entered. Think of it as a map of your journey from the welcome screen. You can use it to jump back anywhere you've been.\n\nTry going back up to see the orange node, but do come back here.','x':64,'y':81,'linked':[3,6],'childmap':{'nodes':[]}},{'id':6,'title':'Psst, in here!','text':'It wouldn't be any fun if we could only work with nodes on the same level.\n\nTry dragging that node (over there) into this one. Then follow it inside!\n\nDouble-click on this node to continue.','x':352,'y':457,'linked':[4],'childmap':{'nodes':[{'id':8,'title':'Up and away','text':'The Up button is another way of navigating the mind map. It takes you back up a level.','x':224,'y':342,'linked':[9],'childmap':{'nodes':[]}},{'id':9,'title':'Creating nodes','text':'Double click on the canvas to create a node. You can represent lots of things with nodes. Lots of things.\n\nTry it!','x':53,'y':242,'linked':[8,12],'childmap':{'nodes':[]}},{'id':10,'title':'','text':'','x':253,'y':54,'linked':[],'childmap':{'nodes':[]}},{'id':11,'title':'','text':'','x':397,'y':52,'linked':[],'childmap':{'nodes':[]}},{'id':12,'title':'Linking nodes','text':'The pencil button allows you to draw links freely between nodes. Click it to toggle it on.\n\nTry linking all the nodes on the page!\n\nYou can't drop nodes that are linked into other nodes.','x':328,'y':171,'linked':[13,9],'childmap':{'nodes':[]}},{'id':13,'title':'Cutting links','text':'The scissors tool allows you to cut links between nodes freely. Try it on those two linked nodes!','x':603,'y':152,'linked':[12,16],'childmap':{'nodes':[]}},{'id':14,'title':'','text':'','x':717,'y':89,'linked':[15],'childmap':{'nodes':[]}},{'id':15,'title':'','text':'','x':713,'y':242,'linked':[14],'childmap':{'nodes':[]}},{'id':16,'title':'Saving the world','text':'Dendryte saves your work automatically after a few seconds of inactivity. No more worries about losing your data.\n\nGo into this node to continue.','x':585,'y':410,'linked':[13],'childmap':{'nodes':[{'id':17,'title':'Deleting nodes','text':'','x':127,'y':207,'linked':[18],'childmap':{'nodes':[]}},{'id':18,'title':'The big canvas','text':'Clicking the Expand button increases the size of the canvas. The size of each node's inner space is theoretically infinite, so create away.','x':299,'y':117,'linked':[17,19],'childmap':{'nodes':[]}},{'id':19,'title':'Layout options','text':'Dendryte has several layout options available. The Grid button, for example, snaps all nodes on the current screen into a clean, grid layout.','x':504,'y':150,'linked':[18,20],'childmap':{'nodes':[]}},{'id':20,'title':'Hotkeys','text':'Most of the functions of the mind map can be accessed from the keyboard. You can work efficiently and quickly, without having to focus on input, once you have them down.','x':628,'y':300,'linked':[19,21],'childmap':{'nodes':[]}},{'id':21,'title':'The end','text':'We hope you enjoy using Dendryte! Lots more features are planned, so check back often.\n\nLet us know if you have any feedback! We welcome suggestions.','x':367,'y':434,'linked':[20],'childmap':{'nodes':[]}}]}}]}},{'id':7,'title':'Drag me inside >','text':'','x':221,'y':487,'linked':[],'childmap':{'nodes':[]}}]}}]}"
                tutorial.put();


            query = db.GqlQuery("SELECT * "
                                "FROM MindmapDocument "
                                "WHERE ANCESTOR IS :1 ",
                                #AND title = 'askjldk' ",
                                #AND id = 0 ",
                                # "ORDER BY date DESC",
                                parent_key)

            template_values = {
                'username': users.get_current_user().nickname(),
                'logout': users.create_logout_url(self.request.host_url),
                'mindmaps': query
            }

            print "Getting documents for %s" % template_values['username']

            for record in query:
                print "    - %s" % (record.title)

            if (query.count() == 0):
                print "    No documents"

            template = jinja_environment.get_template('projects.html')
            self.response.out.write(template.render(template_values))
        else:
            self.redirect(self.request.host_url)

class Mindmap(webapp2.RequestHandler):
    def get(self, data):
        user = users.get_current_user()
        if user:  # check if signed in
            parent_key = db.Key.from_path('Person', users.get_current_user().email())
            
            stringkey = urllib.unquote(data)
            record = db.get(stringkey)

            title = record.title
            contents = urllib.quote(record.contents, "")

            template_values = {
                'username': users.get_current_user().nickname(),
                'logout': users.create_logout_url(self.request.host_url),
                'title': title,
                'contents': contents,
                'key': stringkey # so we know where to save the mind map later
            }

            template = jinja_environment.get_template('mindmap.html')
            self.response.out.write(template.render(template_values))
        else:
            self.redirect(self.request.host_url)

class Delete(webapp2.RequestHandler):
    def get(self, data):
        user = users.get_current_user()
        if user:  # check if signed in
            parent_key = db.Key.from_path('Person', users.get_current_user().email())

            db.delete(urllib.unquote(data))
            self.redirect('/projects')

class New(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:  # check if signed in

            parent_key = db.Key.from_path('Person', users.get_current_user().email())

            item = MindmapDocument(parent=parent_key)
            item.title = "Untitled"
            item.contents = "{\"nodes\":[]}"

            key = item.put();

            self.redirect('/mindmap/%s' % key)

class Save(webapp2.RequestHandler):
    """ Handles post requests to save mind maps """
    def post(self):

        parent_key = db.Key.from_path('Person', users.get_current_user().email())

        # determine which record to update
        stringkey = self.request.get('key')
        item = db.get(stringkey)

        # update record
        item.title = self.request.get('title')
        item.contents = self.request.get('contents')
        key = item.put();

        # not sure why this is needed, but it is
        self.redirect('/projects')

app = webapp2.WSGIApplication([('/projects', Projects),
                               ('/new', New),
                               ('/delete/(.*)?', Delete),
                               ('/mindmap/(.*)?', Mindmap),
                               ('/save', Save)],
                              debug=True)
