import type { TestDetails } from "../model"

// export function getTestDetails(id: string): TestDetails { TODO: Uncomment this line when using dynamic routing to fetch test details based on the test ID
export function getTestDetails(): TestDetails {
    // Mock data for a specific test
    return {
        "course": "Introduction to Software",
        "subject": "Basic Computing & Software",
        "testName": "Beginner Software Quiz",
        "timed": true,
        "time": 600,
        "currentQuestion": 1,
        "totalQuestions": 10,
        "questions": [
            {
                "id": 1,
                "text": "What does HTML stand for?",
                "options": [
                    { "id": "a", "text": "HyperText Markup Language", "selected": false },
                    { "id": "b", "text": "High Tech Modern Language", "selected": false },
                    { "id": "c", "text": "Hyperlink and Text Markup Language", "selected": false },
                    { "id": "d", "text": "Home Tool Markup Language", "selected": false }
                ]
            },
            {
                "id": 2,
                "text": "Which of the following is a programming language?",
                "options": [
                    { "id": "a", "text": "Python", "selected": false },
                    { "id": "b", "text": "HTML", "selected": false },
                    { "id": "c", "text": "CSS", "selected": false },
                    { "id": "d", "text": "SQL", "selected": false }
                ]
            },
            {
                "id": 3,
                "text": "What is the primary function of a web browser?",
                "options": [
                    { "id": "a", "text": "To display web pages", "selected": false },
                    { "id": "b", "text": "To compile code", "selected": false },
                    { "id": "c", "text": "To manage computer hardware", "selected": false },
                    { "id": "d", "text": "To create databases", "selected": false }
                ]
            },
            {
                "id": 4,
                "text": "Which symbol is commonly used for single-line comments in JavaScript?",
                "options": [
                    { "id": "a", "text": "//", "selected": false },
                    { "id": "b", "text": "#", "selected": false },
                    { "id": "c", "text": "/*", "selected": false },
                    { "id": "d", "text": "<!--", "selected": false }
                ]
            },
            {
                "id": 5,
                "text": "What does CSS stand for?",
                "options": [
                    { "id": "a", "text": "Cascading Style Sheets", "selected": false },
                    { "id": "b", "text": "Computer Style System", "selected": false },
                    { "id": "c", "text": "Creative Style Sheets", "selected": false },
                    { "id": "d", "text": "Colorful Style Sheets", "selected": false }
                ]
            },
            {
                "id": 6,
                "text": "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
                "options": [
                    { "id": "a", "text": "Stack", "selected": false },
                    { "id": "b", "text": "Queue", "selected": false },
                    { "id": "c", "text": "Array", "selected": false },
                    { "id": "d", "text": "Linked List", "selected": false }
                ]
            },
            {
                "id": 7,
                "text": "What is Git primarily used for?",
                "options": [
                    { "id": "a", "text": "Version control", "selected": false },
                    { "id": "b", "text": "Designing user interfaces", "selected": false },
                    { "id": "c", "text": "Database management", "selected": false },
                    { "id": "d", "text": "Network security", "selected": false }
                ]
            },
            {
                "id": 8,
                "text": "Which of the following is a relational database management system?",
                "options": [
                    { "id": "a", "text": "PostgreSQL", "selected": false },
                    { "id": "b", "text": "MongoDB", "selected": false },
                    { "id": "c", "text": "Redis", "selected": false },
                    { "id": "d", "text": "Cassandra", "selected": false }
                ]
            },
            {
                "id": 9,
                "text": "What does API stand for?",
                "options": [
                    { "id": "a", "text": "Application Programming Interface", "selected": false },
                    { "id": "b", "text": "Advanced Programming Interaction", "selected": false },
                    { "id": "c", "text": "Automated Program Integration", "selected": false },
                    { "id": "d", "text": "Application Process Integration", "selected": false }
                ]
            },
            {
                "id": 10,
                "text": "Which file extension is typically used for Python source code files?",
                "options": [
                    { "id": "a", "text": ".py", "selected": false },
                    { "id": "b", "text": ".js", "selected": false },
                    { "id": "c", "text": ".html", "selected": false },
                    { "id": "d", "text": ".java", "selected": false }
                ]
            }
        ]
    };
}
