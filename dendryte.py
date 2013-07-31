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

            parent_key = db.Key.from_path('Person', users.get_current_user().email())

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

            # initialize content for new mind maps
            if record.title == None and record.contents == None:
                title = "Untitled"
                contents = "{\"nodes\":[]}"
            else:
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

            # check if user is in database, create if not
            parent_key = db.Key.from_path('Person', users.get_current_user().email())
            person = db.get(parent_key)
            if person == None:
                newPerson = Person(key_name=users.get_current_user().email())
                newPerson.put()

            item = MindmapDocument(parent=parent_key)
            key = item.put();

            self.redirect('/mindmap/%s' % key)

class Save(webapp2.RequestHandler):
    """ Handles post requests to save mind maps """
    def post(self):
        # check if user is in database, create if not
        parent_key = db.Key.from_path('Person', users.get_current_user().email())
        person = db.get(parent_key)
        if person == None:
            newPerson = Person(key_name=users.get_current_user().email())
            newPerson.put()

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
