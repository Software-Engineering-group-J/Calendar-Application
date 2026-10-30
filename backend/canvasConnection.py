#Canvas integration module for StudySync
from canvasapi.canvas import Canvas # Main instance!
from canvasapi.assignment import Assignment
from canvasapi.calendar_event import CalendarEvent
from canvasapi.exceptions import ResourceDoesNotExist, Forbidden, Unauthorized
from canvasapi.paginated_list import PaginatedList
from canvasapi.quiz import Quiz
from canvasapi.new_quiz import NewQuiz

#Global URL to use for creating Canvas connections
_canvasOriginURL = "https://canvas.ou.edu"

class canvasConnection(Canvas):
    '''Extension of canvasapi.canvas.Canvas to efficiently manage PaginatedLists.
    It provides fields to store important objects while traversing each list, so they don't have to be constantly reloaded.'''
    def __init__(self, apiKey, defaultPageCount: int = 10):
        super().__init__(_canvasOriginURL, apiKey)

        self.__defaultPage = defaultPageCount

        self.__coursesTraversed: int = 0
        self.__actualCourses = None #PaginatedList
        self.__coursesFullyTraversed: bool = False
        self._validCourses = {}

        self.__validCalendarEvents = []
        self.__assignmentsOfCourses = {}
        self.__quizzesOfCourses = {}

    #Simple accessors
    def getLoadedCourses(self):
        return self._validCourses

    #TODO: Remove default page count, since it's unlikely we'll overload the API in normal use
    def loadCourses(self, batchName: str = "courses", untilChecked: int = None, untilFound: int = None) -> tuple:
        '''Traverse the courses of the linked account, to take note of valid courses to read from. The method can be limited
        in how many elements are checked, to avoid overloading the API.'''

        #Avoid reloading if we already reached the end (for now)
        if self.__coursesFullyTraversed:
            return (0, "All courses are already loaded.")

        #Get course list
        if not self.__actualCourses:
            self.__actualCourses = super().get_current_user().get_courses()

        searchComplete = False
        amountChecked = 0
        amountToCheck = untilChecked or self.__defaultPage

        while not searchComplete:
            try:
                if untilFound != None: # For unbounded search
                    if untilFound <= 0:
                        searchComplete = True
                        break

                if untilFound == None and amountChecked >= amountToCheck: # For bounded search
                    searchComplete = True
                    break

                if hasattr(self.__actualCourses[self.__coursesTraversed], "name"):
                        self._validCourses[self.__actualCourses[self.__coursesTraversed].id] = self.__actualCourses[self.__coursesTraversed]
                        if untilFound != None:
                            untilFound -= 1
                self.__coursesTraversed += 1
                amountChecked += 1

            except IndexError:
                self.__coursesFullyTraversed = True
                return (0, f"Reached end of course list while searching. Courses are fully loaded ({len(self._validCourses)} courses)")

        return (0, f"Successfully loaded more courses.")

    def getCalendarEvents(self):
        return self.__validCalendarEvents

    #Method to load calendarEvents from the user
    def loadCalendarEvents(self):
        eventsTraversed = 0
        allCalendarEvents = super().get_current_user().get_calendar_events_for_user()
        listEmpty = False

        while not listEmpty:
            try:
                if hasattr(allCalendarEvents[eventsTraversed], "id"):
                    self.__validCalendarEvents.append(allCalendarEvents[eventsTraversed])
                eventsTraversed += 1
            except IndexError:
                listEmpty = True

    #Method to load assignments, quiz lists from a course
    #TODO: Debug quizzes
    def getContentsOfCourse(self, courseID: int) -> dict:
        if not courseID in self._validCourses:
            raise IndexError(f"canvasConnection.getContentsOfCourse: '{courseID}' is not in the accessible course list for this user (did you load the full courses list yet?)")

        if not courseID in self.__assignmentsOfCourses:
            self.__assignmentsOfCourses[courseID] = []
            assignmentsOfCourseId = self._validCourses[courseID].get_assignments()

            try:
                for assignments in assignmentsOfCourseId:
                    try:
                        if hasattr(assignments, "id"):
                            self.__assignmentsOfCourses[courseID].append( assignments )
                    except (Forbidden, Unauthorized):
                        pass
            except ResourceDoesNotExist:
                pass

        if not courseID in self.__quizzesOfCourses:
            self.__quizzesOfCourses[courseID] = []

            quizzesOfCourseId = self._validCourses[courseID].get_quizzes()
            newQuizzesOfCourseId = self._validCourses[courseID].get_new_quizzes()

            try:
                for quizzes in quizzesOfCourseId:
                    try:
                        if hasattr(quizzes, "id"):
                            self.__quizzesOfCourses[courseID].append( quizzes  )
                    except (Forbidden, Unauthorized):
                        pass
            except ResourceDoesNotExist: #Dangerous: we are assuming list ends here, but not necessarily true!
                    pass

            #Currently exhibits weird behavior, avoid for now

            # listEmpty = False
            # while not listEmpty:
            #     try:
            #         #print("newquiz id {newQuizzesTraversed}")
            #         if hasattr(newQuizzesOfCourseId[newQuizzesTraversed], "id"):
            #             self.__quizzesOfCourses[courseID].append( newQuizzesOfCourseId[assignmentsTraversed] )
            #         newQuizzesTraversed += 1
            #     except IndexError:
            #         listEmpty = True
            #     except Forbidden:
            #         newQuizzesTraversed += 1
            #         print(f"forbidden {newQuizzesTraversed}")
            #     except Unauthorized:
            #         newQuizzesTraversed += 1
            #         print(f"unauthorized {newQuizzesTraversed}")
            #     except ResourceDoesNotExist:
            #         listEmpty = True

        return {"assignments": self.__assignmentsOfCourses[courseID], "quizzes": self.__quizzesOfCourses[courseID]}
