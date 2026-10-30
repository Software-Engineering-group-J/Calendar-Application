### WARNING
# As of writing, this module is still in the early testing phase and we don't have a dev key
# We use personal API keys linked to our actual student accounts (for now)
# For the purposes of the ticket review, I've attatched one of these keys
# The key will expire after class, don't hack me zawg 🙏

#Unit tests for canvasConnection
import unittest
from backend.canvasConnection import canvasConnection
from datetime import datetime as dt
from backend.main import assignment_or_quiz_to_event_input, EventInput

#Import personal Canvas API key from file "PPCKEY"
keyPresent = False
try:
    with open("PPCKEY.txt", 'r') as keyFile:
        API_KEY = keyFile.readline()
    keyPresent = True
except FileNotFoundError:
    print("warn: 'PPCKEY.txt' file not found, not running live pull tests\nIf you want to run the live tests to pull data from OU Canvas, pull a temporary personal key from Canvas by going to Account -> Settings -> Approved Integrations -> New Access Token, then copy it's contents into the aforementioned filename. This is not advisable, so there are placeholder tests to poke at some functionalities without using your key.")

if keyPresent:
    #Check if you're enrolled in the class first
    canvasTest = canvasConnection(API_KEY)
    canvasTest.loadCourses(untilFound = 1000)
    if not 492287 in canvasTest.getLoadedCourses():
        raise Exception("zawg wth (FAIL: No enrollment for CS-3203 found.)")

    #Create testcases
    class testGetContentsFromCourse(unittest.TestCase):
        def testCorrect(self):
            amountOfQuizignments = len(canvasTest.getContentsOfCourse(492287)["assignments"]) + len(canvasTest.getContentsOfCourse(492287)["quizzes"])
            if not amountOfQuizignments == 31:
                print(f"warn: Tried checking CS-3203 for 31 assignments, but found {amountOfQuizignments}. Maybe changed?")#I think this is correct at the time of writing
        def testIncorrect(self):
            self.assertFalse( 41616789420 in canvasTest.getLoadedCourses() )
            try:
                canvasTest.getContentsOfCourse(41616789420)
                self.assertTrue(False) #If the above doesn't raise the right error, instant fail
            except IndexError:
                pass
            #TODO: Need to get a Canvas instance to test more edge cases


# Example of full assignment
# Assignment( requester = Requester(),
#     attributes = {
#   "id": 4,
#   "name": "some assignment",
#   "description": "<p>Do the following:</p>...",
#   "created_at": "2012-07-01T23:59:00-06:00",
#   "updated_at": "2012-07-01T23:59:00-06:00",
#   "due_at": "2012-07-01T23:59:00-06:00",
#   "lock_at": "2012-07-01T23:59:00-06:00",
#   "unlock_at": "2012-07-01T23:59:00-06:00",
#   "has_overrides": True,
#   "all_dates": None,
#   "course_id": 123,
#   "html_url": "https://...",
#   "submissions_download_url": "https://example.com/courses/:course_id/assignments/:id/submissions?zip=1",
#   "assignment_group_id": 2,
#   "due_date_required": True,
#   "allowed_extensions": ["docx", "ppt"],
#   "max_name_length": 15,
#   "turnitin_enabled": True,
#   "vericite_enabled": True,
#   "turnitin_settings": None,
#   "grade_group_students_individually": False,
#   "external_tool_tag_attributes": None,
#   "peer_reviews": False,
#   "automatic_peer_reviews": False,
#   "peer_review_count": 0,
#   "peer_reviews_assign_at": "2012-07-01T23:59:00-06:00",
#   "intra_group_peer_reviews": False,
#   "group_category_id": 1,
#   "needs_grading_count": 17,
#   "needs_grading_count_by_section": [{"section_id":"123456","needs_grading_count":5}, {"section_id":"654321","needs_grading_count":0}],
#   "position": 1,
#   "post_to_sis": True,
#   "integration_id": "12341234",
#   "integration_data": {"5678":"0954"},
#   "points_possible": 12.0,
#   "submission_types": ["online_text_entry"],
#   "has_submitted_submissions": True,
#   "grading_type": "points",
#   "grading_standard_id": None,
#   "published": True,
#   "unpublishable": False,
#   "only_visible_to_overrides": False,
#   "locked_for_user": False,
#   "lock_info": None,
#   "lock_explanation": "This assignment is locked until September 1 at 12:00am",
#   "quiz_id": 620,
#   "anonymous_submissions": False,
#   "discussion_topic": None,
#   "freeze_on_copy": False,
#   "frozen": False,
#   "frozen_attributes": ["title"],
#   "submission": None,
#   "use_rubric_for_grading": True,
#   "rubric_settings": {"points_possible":"12"},
#   "rubric": None,
#   "assignment_visibility": [137, 381, 572],
#   "overrides": None,
#   "omit_from_final_grade": True,
#   "hide_in_gradebook": True,
#   "moderated_grading": True,
#   "grader_count": 3,
#   "final_grader_id": 3,
#   "grader_comments_visible_to_graders": True,
#   "graders_anonymous_to_graders": True,
#   "grader_names_visible_to_final_grader": True,
#   "anonymous_grading": True,
#   "allowed_attempts": 2,
#   "post_manually": True,
#   "score_statistics": None,
#   "can_submit": True,
#   "ab_guid": ["ABCD", "EFGH"],
#   "academic_integrity_pledge": "This submission reflects my own ideas and work",
#   "annotatable_attachment_id": None,
#   "anonymize_students": False,
#   "require_lockdown_browser": False,
#   "important_dates": False,
#   "muted": False,
#   "anonymous_peer_reviews": False,
#   "anonymous_instructor_annotations": False,
#   "graded_submissions_exist": False,
#   "is_quiz_assignment": False,
#   "in_closed_grading_period": False,
#   "can_duplicate": False,
#   "original_course_id": 4,
#   "original_assignment_id": 4,
#   "original_lti_resource_link_id": 4,
#   "original_assignment_name": "some assignment",
#   "original_quiz_id": 4,
#   "workflow_state": "unpublished"
# })

#Creating a real orphaned canvas.assignment.Assignment is too hard
#So this class provides an analog with the relavant fields
class dummyQuiz:
    validAttributes = ["created_at_date", "unlock_at_date", "due_at_date", "lock_at_date", "title", "instructions", "course_id"]
    def __init__(self, **kwargs):
        for key in kwargs:
            if key in self.validAttributes:
                exec(f"self.{key} = kwargs[key]")
        for attribute in self.validAttributes:
            if not hasattr(self, attribute):
                exec(f"self.{attribute} = 'None'")

validAssignment1 = dummyQuiz(unlock_at_date = dt.fromisoformat("2026-04-20T23:59:00-05:00"), due_at_date = dt.fromisoformat("2026-04-20T23:59:00-05:00"))
validAssignment2 = dummyQuiz(unlock_at_date = dt.fromisoformat("2026-12-31T23:59:59-06:00"), due_at_date = dt.fromisoformat("2027-01-01T00:00:00-06:00"))
validAssignment3 = dummyQuiz(unlock_at_date = dt.fromisoformat("2026-06-30T23:59:30-05:00"), due_at_date = dt.fromisoformat("2026-07-01T00:00:30-05:00"))

validEdgeAssignment1 = dummyQuiz( unlock_at_date = dt.fromisoformat("2026-01-31T23:30:00-06:00"), due_at_date = dt.fromisoformat("2026-02-01T00:30:00-06:00") )
validEdgeAssignment2 = dummyQuiz( unlock_at_date = dt.fromisoformat("2028-02-28T23:30:00-06:00"), due_at_date = dt.fromisoformat("2028-02-29T00:30:00-06:00") )

invalidAssignment1 = dummyQuiz( unlock_at_date = dt.fromisoformat("2026-02-01T00:30:00-06:00"), due_at_date = dt.fromisoformat("2026-01-31T23:30:00-06:00") )
invalidAssignment2 = dummyQuiz( unlock_at_date = dt.fromisoformat("2026-09-10T09:00:00+02:00"), due_at_date = dt.fromisoformat("2026-09-10T08:30:00+02:00") )
invalidAssignment3 = dummyQuiz(unlock_at_date = dt.fromisoformat("2026-05-12T16:30:00-05:00"), due_at_date = dt.fromisoformat("2026-05-12T15:30:00-05:00"))

#Other cases
# unlock_at_date = "2026-12-31T23:59:59-06:00", due_at_date =  "2027-01-01T00:00:00-06:00"
# unlock_at_date = "2027-01-01T00:00:00-06:00", due_at_date =  "2026-12-31T23:59:59-06:00"
# unlock_at_date = "2028-02-28T23:30:00-06:00", due_at_date =  "2028-02-29T00:30:00-06:00"
# unlock_at_date = "2027-02-28T23:30:00-06:00", due_at_date =  "2027-03-01T00:30:00-06:00"
#
# unlock_at_date = "2026-10-31T23:00:00-05:00", due_at_date =  "2026-11-01T01:00:00-05:00"
# unlock_at_date = "2026-08-15T12:00:00+00:00", due_at_date =  "2026-08-15T12:00:00+00:00"
# unlock_at_date = "2026-09-10T09:00:00+02:00", due_at_date =  "2026-09-10T08:30:00+02:00"
# unlock_at_date = "2026-11-05T09:00:00-06:00", due_at_date =  "2026-11-05T10:00:00-05:00"
# unlock_at_date = "2026-11-05T09:00:00-05:00", due_at_date =  "2026-11-05T09:30:00-06:00"
# unlock_at_date = "2026-11-05T09:00:00-06:00", due_at_date =  "2026-11-05T09:30:00-05:00"
# unlock_at_date = "2026-01-01T00:00:00+14:00", due_at_date =  "2026-01-01T00:00:01+14:00"
# unlock_at_date = "2026-01-01T00:00:00-12:00", due_at_date =  "2026-01-02T00:00:00-12:00"
# unlock_at_date = "2026-07-01T23:59:59.500000-05:00", due_at_date =  "2026-07-02T00:00:00.500000-05:00"

class testAssignmentToEventInput(unittest.TestCase):
    def testCorrect(self):
        resultList = []
        for events in [validAssignment1, validAssignment2, validAssignment3]:
            resultList.append( assignment_or_quiz_to_event_input(events) )
    def testEdge(self):
        resultList = []
        for events in [validEdgeAssignment1, validEdgeAssignment2]:
            resultList.append( assignment_or_quiz_to_event_input(events) )
    def testIncorrect(self):
        for events in [invalidAssignment1, invalidAssignment2]:
            try:
                assignment_or_quiz_to_event_input(events) #Should immediately error
                self.assertTrue(False)
            except ValueError:
                pass

if __name__ == "__main__":
    unittest.main()
