# JanMitra – AI Powered Government Benefit Navigator

JanMitra is an AI-powered platform that helps citizens discover and access government welfare schemes. It simplifies complex government policies using AI agents, eligibility analysis, and voice interaction, ensuring that citizens never miss the benefits they qualify for.

JanMitra acts as a digital government companion that guides users through scheme discovery, eligibility checking, and application processes.

--------------------------------------------------

PROJECT OVERVIEW

JanMitra is designed to bridge the gap between citizens and government welfare programs. Many people are unaware of schemes or find government policy documents difficult to understand. The platform uses artificial intelligence to interpret policies, determine eligibility, and guide users through the process of accessing benefits.

--------------------------------------------------

PROBLEM STATEMENT

Millions of citizens fail to access government benefits they qualify for due to multiple barriers.

Key Challenges

- Government policies are complex and difficult to understand
- Eligibility criteria are hidden inside long policy documents
- Citizens are unaware of available schemes
- Many people miss application deadlines
- Rural populations face language and digital literacy barriers

Impact

Because of these challenges, millions of citizens lose access to financial aid, subsidies, and welfare programs that are meant to support them.

--------------------------------------------------

PROPOSED SOLUTION

JanMitra provides an AI-powered digital assistant that enables citizens to:

- Discover government schemes they qualify for
- Understand policies in simple language
- Automatically check eligibility
- Receive step-by-step guidance on how to apply
- Get deadline reminders for schemes

The platform makes government programs accessible, transparent, and user-friendly.

--------------------------------------------------

PLATFORM

JanMitra is developed as a web-based platform that allows users to interact through:

- Text input
- Voice interaction
- Interactive dashboard

--------------------------------------------------

CORE FEATURES

1. Scheme Discovery

Users can search and discover relevant government schemes. The platform provides personalized scheme recommendations based on user information.

2. Eligibility Checking

The system evaluates whether a citizen qualifies for specific schemes.

Eligibility is calculated based on:

- Income
- Age
- Profession
- State
- Gender

The system then generates a personalized list of schemes that the user qualifies for.

3. Policy Simplification

Complex government policy documents are converted into simple and understandable explanations using artificial intelligence.

4. Voice Interaction

Users can interact with the platform using voice commands.

Benefits include:

- Improved accessibility
- Support for rural users
- Multilingual communication

5. Deadline Alerts

The platform tracks scheme deadlines and sends alerts before applications close so that citizens do not miss opportunities.

--------------------------------------------------

AI MULTI-AGENT ARCHITECTURE

JanMitra operates using multiple AI agents that collaborate to process user queries and deliver results.

1. Citizen Assistant Agent

Role: Main AI controller

Responsibilities:

- Interacts with the user
- Understands user queries
- Extracts user information
- Calls other system modules
- Provides scheme recommendations
- Guides users through application steps

2. Voice Interaction Agent

Purpose: Enable voice-based interaction.

Process Flow:

User Voice  
↓  
Speech-to-Text  
↓  
Citizen Assistant Agent  
↓  
Text-to-Speech Response

This improves accessibility and allows users to interact with the system naturally.

3. Policy Understanding Agent

Purpose: Automatically interpret government policy documents.

Functions:

- Reads policy documents (PDFs)
- Extracts key information
- Converts policy text into structured data

Extracted Information:

- Scheme name
- Eligibility criteria
- Benefits
- Application deadline

4. Eligibility Intelligence Engine

Purpose: Determine whether users qualify for government schemes.

Inputs:

- State
- Age
- Income
- Profession
- Gender

Output:

A personalized list of government schemes the user is eligible for.

5. Deadline Notification Agent

Purpose: Monitor scheme deadlines.

Functions:

- Tracks application dates
- Sends alerts before deadlines
- Ensures users do not miss opportunities

--------------------------------------------------

USER INTERACTION FLOW

Step 1  
The user enters information or asks a query.

Example:  
"I am a farmer from Punjab"

Step 2  
The Citizen Assistant Agent analyzes the request.

Step 3  
The Eligibility Engine checks matching schemes.

Step 4  
The system returns personalized recommendations.

Example Output:

Eligible Schemes:
PM Kisan  
Crop Insurance Scheme  
Kisan Credit Card  

Step 5  
The platform provides guidance on how to apply.

Step 6  
The Deadline Agent sends reminders for upcoming application deadlines.

--------------------------------------------------

USER INTERFACE STRUCTURE

The platform dashboard includes the following sections:

Citizen Profile  
Stores the basic details of the user.

Eligible Schemes  
Displays the schemes the user qualifies for.

Voice Assistant  
Allows interaction using voice commands.

Deadline Alerts  
Displays notifications for upcoming scheme deadlines.

--------------------------------------------------

TECH STACK

Frontend

- React
- Tailwind CSS
- JavaScript

Backend

- Node.js
- Express

AI and Data

- Supabase
- Vector Search
- Large Language Model APIs
- OCR for policy document extraction

Voice Processing

- Speech-to-Text
- Text-to-Speech

--------------------------------------------------

PROJECT STRUCTURE

JanMitra
│
├── client
│   ├── src
│   ├── components
│   ├── pages
│   └── App.js
│
├── server
│   ├── agents
│   │   ├── citizenAgent.js
│   │   ├── policyAgent.js
│   │   ├── deadlineAgent.js
│   │   └── voiceAgent.js
│   │
│   ├── routes
│   ├── services
│   └── server.js
│
├── package.json
└── README.md

--------------------------------------------------

GETTING STARTED

1. Clone the Repository

git clone https://github.com/yourusername/janmitra.git

cd janmitra

--------------------------------------------------

2. Install Dependencies

Install dependencies for the project.

npm install

If the backend is inside a server folder:

cd server  
npm install

--------------------------------------------------

RUNNING THE PROJECT

JanMitra runs using two terminals.

--------------------------------------------------

Terminal 1 – Start Frontend

npm start

This will start the React frontend at:

http://localhost:3000

--------------------------------------------------

Terminal 2 – Start Backend Server

Open a new terminal and navigate to the server folder:

cd server

Then start the backend server:

node server.js

or

npm run dev

The backend server will run at:

http://localhost:3001

--------------------------------------------------

FRONTEND AND BACKEND COMMUNICATION

The frontend sends API requests to:

http://localhost:3001/api

The backend processes these requests using the AI agents and returns the results to the frontend.

--------------------------------------------------

EXPECTED IMPACT

JanMitra can significantly improve access to government welfare programs by:

- Increasing awareness of schemes
- Simplifying policy understanding
- Supporting rural and underserved communities
- Improving accessibility to welfare programs
- Bridging the gap between citizens and government services

--------------------------------------------------

FUTURE SCOPE

JanMitra can be expanded with additional capabilities including:

- Integration with government portals
- DigiLocker integration
- Support for more regional languages
- Automated scheme application submission
- Mobile application support

--------------------------------------------------

CONCLUSION

JanMitra transforms complex government policies into a simple and accessible digital service.

By combining AI agents, voice interaction, eligibility intelligence, and deadline monitoring, the platform ensures that every citizen can easily discover and access the benefits they deserve.

The platform ultimately strengthens the connection between government programs and the citizens they are designed to support.
