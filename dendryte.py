import urllib
import webapp2
import jinja2
import os
import logging
#import datetime

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
    contents = db.StringProperty()
    date = db.DateTimeProperty(auto_now_add=True)

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

            # default mind map content
            title = "Untitled"
            contents = "{\"nodes\":[]}"
            
            stringkey = urllib.unquote(data)

            if stringkey != "new":
                # if this isn't a new mind map, query the database for
                # its title and content
                # key = db.Key(stringkey)
                # query = db.GqlQuery("SELECT * "
                #                     "FROM MindmapDocument "
                #                     "WHERE ANCESTOR IS :1 AND __key__ = :2 ",
                #                     parent_key, key)

                # if query.count() == 0:
                #     print "Error: record %s not found" % stringkey
                # elif query.count() > 1:
                #     print "Error: more than one record with key %s" % stringkey
                # else:
                #     # there's only one record
                #     for record in query:
                #         title = record.title
                #         contents = record.contents
                record = db.get(stringkey)
                title = record.title
                contents = record.contents

            template_values = {
                'username': users.get_current_user().nickname(),
                'logout': users.create_logout_url(self.request.host_url),
                'title': title,
                'contents': urllib.quote(contents, ""),
                'key': stringkey # so we know where to save the mind map later
            }

            template = jinja_environment.get_template('mindmap.html')
            self.response.out.write(template.render(template_values))
        else:
            self.redirect(self.request.host_url)

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

        if stringkey == "new":
            # create a new mind map
            item = MindmapDocument(parent=parent_key)
        else:
            # # load the current mind map and update it
            # key = db.Key(urllib.unquote(stringkey))
            # query = db.GqlQuery("SELECT * "
            #                     "FROM MindmapDocument "
            #                     "WHERE ANCESTOR IS :1 AND __key__ = :2 ",
            #                     parent_key, key)

            # if query.count() == 0:
            #     print "Error: record %s not found" % stringkey
            #     # create a new mind map
            #     item = MindmapDocument(parent=parent_key)
            # elif query.count() > 1:
            #     print "Error: more than one record with key %s" % stringkey
            # else:
            #     for record in query:
            #         item = record
            item = db.get(stringkey)

        # update record
        item.title = self.request.get('title')
        item.contents = self.request.get('contents')
        item.put();

        self.redirect('/projects')

app = webapp2.WSGIApplication([('/projects', Projects),
                               ('/mindmap/(.*)?', Mindmap),
                               ('/save', Save)],
                              debug=True)
