import {drizzle} from 'drizzle-orm/bun-sqlite';
import {Database} from 'bun:sqlite';
import * as schema from '../schema';
import {v4 as uuidv4} from 'uuid';
import { memory_categories } from '../config/memory.config';
import seedData from '../../seed.json';
import type { NewMessage } from '../schema/message';

const sqlite = new Database('./agi.db');
const db = drizzle(sqlite, {schema});

const tools = [
//   {
//     uuid: '24c5dbc0-c3ac-41d1-906f-f22b21272088',
//     name: 'spotify',
//     description:
//       `This tool interfaces with Spotify to play and search for music. It can handle tracks, playlists, and albums. When a specific track name is provided, it will play immediately. For general requests like 'play soundtrack from...', it will first search the Spotify database to confirm availability.`,
//     instruction: `Use the following actions based on the user's request type:

// 1. For specific track requests (when the user provides both the exact track name and artist):
//    { "action": "play_music", "payload": { "query": "<exact track name by artist>" } }

// 2. For general or ambiguous requests:
//    a) First, search: { "action": "search_music", "payload": { "query": "<search terms>" } }
//    b) Then, play the result: { "action": "play_music", "payload": { "query": "<result from search>" } }

// <action_rules>
// - A request is considered specific only if it includes both the exact track name and the artist.
// - For specific requests, use play_music action directly without searching.
// - For all other requests (general, partial information, or ambiguous), always use search_music before play_music.
// - If uncertain whether a request is specific or general, treat it as general and use the search step.
// </rules>
// `
//   },
  {
    uuid: '3e662060-2294-4d5e-a3c2-8ea466ccd52e',
    name: 'files',
    description: `Use this tool to manage file operations:
- Load content from URLs incl youtube (not embedded images!)
- Create new text files to write down notes, some contents / analyze it / extract information from existing context or conversation / summarize available documents or informations  
- Upload documents to generate shareable URLs

Supports: text, images, audio, video, and specific website URLs (not search queries).
Info: You may refer contents of documents / action result by using their UUIDs in a payload as presented in the examples below.

Note: You can load multiple files in one action, but uploads require separate actions.
Warning: this tool can't be used with embedded images since you can read their content without any tools`,
    instruction: `Available actions and their formats:

1. LOAD URL
   {
     "action": "load",
     "payload": {
       "path": "url or path"
     }
   }
   Use: Retrieves content from specified URLs.

2. WRITE
   {
     "action": "write",
     "payload": {
       "query": "Description of file content. This should be self-query that you write to yourself in order to create contents of the file, whenever you need to write something/analyze existing content / write down notes/prepare some content. It should include all relevant information needed to perform this action",
       "context": ["uuid1", "uuid2"]
     }
   }
   Use: Creates a new file. Returns a UUID, not a URL. Use this UUID for uploads.
   Note: "context" can be empty or contain UUIDs of relevant documents.

3. UPLOAD
   {
     "action": "upload",
     "payload": {
       "doc": "uuid"
     }
   }
   Use: Generates a public URL for a file. Use this to share files with users.

Important: To share a file you've created, always use the UPLOAD action with the UUID from the WRITE action.`
  },
  {
    uuid: '9df7bfcf-d6a3-4477-a384-f69aa891d625',
    name: 'google',
    description: 'Use this to search the web',
    instruction: 'To search the web write { "action": "search", "payload": { "query": "<search query>" } }'
  },
  {
    uuid: 'bac7897e-b6a2-411a-836f-77e2ff2baa0d',
    name: 'linear',
    description:
      'Use this to manage tasks in Linear. You can add new tasks (multiple at once), update existing tasks (multiple at once), and search for tasks within specific projects and date ranges.',
    instruction: `Available actions:

1. ADD TASKS:
   Format: { "action": "add_tasks", "payload": { "tasks": [{ "title": "Task title", "description": "Task description", "priority": 1-4, "projectId": "project_uuid", "stateId": "state_uuid", "estimate": number, "labelIds": ["label_uuid1", "label_uuid2"], "startDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD" }] } }
   Note: Only title is required. Other fields are optional.

2. UPDATE TASKS:
   Format: { "action": "update_tasks", "payload": { "tasks": [{ "issueId": "task_uuid", "title": "Updated title", "description": "Updated description", "priority": 1-4, "projectId": "project_uuid", "stateId": "state_uuid", "estimate": number, "labelIds": ["label_uuid1", "label_uuid2"], "startDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD" }] } }

3. SEARCH TASKS:
   Format: { "action": "search_tasks", "payload": { "projectIds": ["project_uuids that needs to be searched. By default, search all projects unless the user asks for specific ones"], "startDate": "YYYY-MM-DD HH:mm, defaults to today - 7 days 00:00", "endDate": "YYYY-MM-DD, defaults to today + 7 days 23:59" } }
   Note: All fields are required. Returns active (non-completed) tasks within the specified date range. Make sure to use -7 days + 7 days for default search unless the user asks for something else.

Available states:
- New: "fd9e4c84-ecc3-4c04-973f-26fac2d0b294"
- Canceled: "f96f2997-50b8-40c1-a1c8-90b8869a3d32"
- Backlog: "d414e77c-0bb9-4554-88fb-1dba0fa3b434"
- Current: "9e510759-093b-41df-9cb8-9ff8a0d4cb1c"
- Done: "599ef3db-5579-48c9-8482-04508f75f868"

Available projects:
${seedData.projects.map(p => `- ${p.name}: "${p.uuid}" — ${p.description}`).join('\n')}

When specifying projectId or stateId, use the corresponding UUID from the available options.`
  },
  {
    uuid: '5ccbd518-fa47-469b-85bb-994acbeda89d',
    name: 'calendar',
    description: 'Use this tool to manage Google Calendar events. You can create, update, and search for events.',
    instruction: `Available actions and their formats:

1. CREATE EVENT
   {
     "action": "create_event",
     "payload": {
       "summary": "Event title",
       "description": "Event description",
       "location": "Event location",
       "start": {
         "dateTime": "YYYY-MM-DD HH:mm"
       },
       "end": {
         "dateTime": "YYYY-MM-DD HH:mm"
       }
     }
   }

2. UPDATE EVENT
   {
     "action": "update_event",
     "payload": {
       "eventId": "event_id_from_google",
       "summary": "Updated title",
       "description": "Updated description",
       "location": "Updated location",
       "start": {
         "dateTime": "YYYY-MM-DD HH:mm"
       },
       "end": {
         "dateTime": "YYYY-MM-DD HH:mm"
       }
     }
   }

3. SEARCH EVENTS
   {
     "action": "search_events",
     "payload": {
       "query": "search text",
       "timeMin": "YYYY-MM-DD HH:mm",  // optional, defaults to 7 days ago
       "timeMax": "YYYY-MM-DD HH:mm",  // optional, defaults to 7 days ahead
       "maxResults": 10  // optional, defaults to 10
     }
   }

Notes:
- All dates must be in ISO 8601 format
- Default timezone is Europe/Warsaw
- For recurring events, use RRULE in the event description
- Attendees are optional
- Search supports partial matching of event titles and descriptions
- TimeMin/TimeMax are optional for search but help narrow results
- Authentication is handled automatically`
  },
  {
    uuid: '907278d1-a972-4c89-b7e5-51c99dd73f94',
    name: 'resend',
    description:
      'This tool interfaces with email service to send messages to the user. It supports both plain text and HTML formats, with ability to include attachments. When referencing documents or action results in the email body, you can use their UUIDs. Common use cases include sending summaries, reports, notifications, and documents.',
    instruction: `Use the following format to send emails:

{
  "action": "send_email",
  "payload": {
    "subject": "<Choose from recommended subjects or create appropriate one>",
    "attachments": ["uuid1", "uuid2"] // Optional: UUIDs of documents or action results,
    "text": "<Plain text version of the email message. Contents may include uuids using placeholders like [[uuid1]] [[uuid2]] merged with content in natural way like 'Here is the document [[uuid1]]', but you can't use UUIDs that were already added as attachments. It may be a content written by you based on what the user says and what is available within the current conversation all information you posses. . When writing, mimic Paul Graham and Shane Parrish style of writing. Use rich markdown formatting to maintain readability and keep in mind that you're writing to best friend, so skip formal form and expressions entirely. It's about value & fun, not corporate procedures, lol.>"
  }
}

Recommended subject lines:
- "Summary: [Topic]" - for summarizing discussions or research
- "Report: [Activity/Project]" - for status updates
- "Document: [Name]" - when sending files
- "Action Required: [Task]" - for important notifications
- "Schedule: [Event]" - for calendar-related information

Notes:
- Adopt Paul Graham's writing style, characterized by:
  - Clear, concise prose with short paragraphs
  - Use of analogies and real-world examples
  - Thought-provoking ideas and contrarian viewpoints
  - A conversational tone that engages the reader
  - Occasional use of rhetorical questions
  - Focus on startups, technology, and societal observations
- When writing, use friendly, easygoing, sometimes sarcastic tone of voice
- When writing, use the fewest words possible but ensure comprehensive coverage of everything needed. Stay driven and motivated to deliver everything you've been asked for, as if you were David Goggins — you don't finish when you're tired; you finish when you're done.
- When writing, mimic Paul Graham and Shane Parrish style of writing
- If you have some content available and the user asks for some specific information, you must rewrite only the requested information, not to reference document/actions UUIDs
- You can reference document/action UUIDs within email body using their IDs but only if you need the entire content, otherwise it's better to simply rewrite parts of the content in the email body
- Don't refer the UUID when the content is not redable for human unless you're doing it in attachment field
- Attachments array can include UUIDs of previously created documents or action results
- Always provide a plain text version, HTML is optional
- Keep subjects clear and descriptive
- STRICTLY FORBIDDEN: Use of words like 'fascinating', 'impactful', 'exhaustive', 'impressive', 'groundbreaking', 'shocking', 'delve in', 'diving in' or similar descriptive adjectives unless explicitly requested by the user
- Maintain a measured, factual tone throughout, focusing on objective information rather than subjective impressions
- Use understatement rather than overstatement to convey importance
- ALWAYS fulfill user requests precisely, completely, and to the letter`
  },
  {
    uuid: '945b84e9-05e7-48d8-b9ba-104785a7eed4',
    name: 'memory',
    description: 'Use this to search, create, update, or delete memories. Memories are organized by categories and can be recalled based on context. Memories are things that Alice knows about herself, the user and their world. Keep in mind that calendar events and tasks are not memories as they are stored in external services.',
    instruction: `Available actions:

1. RECALL MEMORIES
   {
     "action": "recall",
     "payload": {
       "query": "<search query>",
       "filters": {
         "source_uuid": "<optional uuid>",
         "source": "<optional source>",
         "content_type": "chunk" | "full" | "memory",
         "category": "<optional category>",
         "subcategory": "<optional subcategory>"
       },
       "limit": <optional number, default: 15>,
       "conversation_uuid": "<optional conversation uuid>"
     }
   }

2. CREATE MEMORY
   {
     "action": "remember",
     "payload": {
       "name": "<memory name>",
       "text": "<memory content>",
       "category": "<category name>",
       "subcategory": "<subcategory name>",
       "conversation_uuid": "<optional conversation uuid>"
     }
   }

3. UPDATE MEMORY
   {
     "action": "update",
     "payload": {
       "memory_uuid": "<memory uuid>",
       "name": "<optional new name>",
       "category_uuid": "<optional new category uuid>",
       "text": "<optional new text>",
       "conversation_uuid": "<optional conversation uuid>"
     }
   }

4. DELETE MEMORY
   {
     "action": "forget",
     "payload": {
       "memory_uuid": "<memory uuid>",
       "conversation_uuid": "<optional conversation uuid>"
     }
   }

Notes:
- Query must be a detailed question to yourself that contains all the details and keywords you have to help you access the memories
- In the query include keywords, phrases and facts, because contents of the query will be used to search/create/update/delete your memories
- The query related to the entities must include their name(s) if you have an access to them
- All actions return a document with the operation result
- For recall, you can filter by various parameters and category&subcategory are REQUIRED
- Memory categories must exist in the system
- Content types: "chunk" (partial), "full" (complete), "memory" (memory-specific)
- Default limit for recall is 15 items`
  },
  {
    uuid: '75200c77-0e17-4857-8b9c-2fe11bd59ec1',
    name: 'lights',
    description: 'Use this tool to control Elgato Key Light. You can turn the light on or off.',
    instruction: `Use the following actions to control the light:

1. Turn ON:
   { "action": "on", "payload": { "conversation_uuid": "<uuid>" } }

2. Turn OFF:
   { "action": "off", "payload": { "conversation_uuid": "<uuid>" } }

Notes:
- Each action will return a confirmation document
- Use this when the user asks to control the lighting or mentions the Elgato Key Light
- The light status will be reflected in the returned document`
  },
  {
    uuid: 'd8f5e380-a0d4-4f55-9a7f-a78f97b2d115',
    name: 'speak',
    description:
      'Use this tool when you want to speak out loud to the user. You can use either a basic voice or a more natural-sounding voice through ElevenLabs. This is particularly useful when you want to verbally communicate important information, provide notifications, or make your responses more interactive.',
    instruction: `Use the following format to trigger speech:

{
  "action": "speak",
  "payload": {
    "text": "<text to be spoken>"
  }
}

Notes:
- Keep text concise and clear for better speech synthesis
- Use punctuation appropriately to control speech pacing
- For longer text, consider breaking it into smaller chunks
- Don't cite links, long identifiers or fragments that are hard to pronounce and just mention them if needed`
  },
  {
    uuid: '355db20e-f194-411d-9567-7073e13b7624',
    name: 'final_answer',
    description: 'Use this to answer the user',
    instruction: 'To answer the user write { "answer": "<answer>" }'
  },
  {
    uuid: '0de46d88-86dd-4051-9274-cece3e8382c0',
    name: 'maps',
    description: `This tool interfaces with Google Maps to provide location-based services:
- Search for places by name or address to get their IDs
- Get detailed information about places based on their IDs (businesses, landmarks, etc.)
- Get directions between locations with support for driving and walking modes

So if you need to get detailed information about a place, you first need to search for it to get the place ID, and then use the place ID to get the details.`,
    instruction: `Available actions and their formats:

1. SEARCH PLACE
   {
     "action": "search_place",
     "payload": {
       "query": "<search text>"
     }
   }
   Use: Searches for places matching the query text. Returns basic information including place IDs.

2. PLACE DETAILS
   {
     "action": "place_details",
     "payload": {
       "place_id": "<google_place_id>"
     }
   }
   Use: Retrieves detailed information about a specific place including name, address, ratings, reviews, opening hours, etc.

3. DIRECTIONS
   {
     "action": "directions",
     "payload": {
       "origin": "<starting location>",
       "destination": "<ending location>",
       "mode": "driving" | "walking"
     }
   }
   Use: Gets navigation directions between two locations. Mode defaults to "driving" if not specified.

Notes:
- For locations, use specific addresses or well-known place names
- Use search_place to find place IDs, then use place_details for more information
- Directions include distance, duration, and step-by-step instructions`
  },
  {
    uuid: 'c4a9ec40-5432-494f-9714-55543b8058e8',
    name: 'crypto',
    description: 'Use this tool to check cryptocurrency prices in USD. You can check multiple currencies at once.',
    instruction: `To check crypto prices, use the following format:

{
  "action": "convert",
  "payload": {
    "symbols": "<space-separated list of crypto symbols>",
    "amount": <optional number, defaults to 1>
  }
}

Examples:
1. Check BTC price:
   { "action": "convert", "payload": { "symbols": "BTC" } }

2. Check multiple currencies:
   { "action": "convert", "payload": { "symbols": "BTC ETH DOGE" } }

3. Check specific amount:
   { "action": "convert", "payload": { "symbols": "ETH", "amount": 2.5 } }

Notes:
- Symbols should be space-separated (e.g., "BTC ETH DOGE")
- Amount is optional and defaults to 1
- All prices are returned in USD
- Supports both cryptocurrencies and some fiat currencies`
  }
];

const categories = memory_categories;

const users = [
  {
    uuid: uuidv4(),
    name: 'Kinder',
    email: 'lukaskiedrowski@gmail.com',
    token: process.env.API_KEY, // random token for auth
    active: true,
    phone: '+1234567890', // placeholder phone
    context: 'developer from Poznan',
    environment: JSON.stringify({
      location: 'Poznan, at home.',
      time: '2024-11-16T16:28:00.000Z',
      weather: 'Partly cloudy, 12°C',
      music: 'AC/DC - Back in Black',
      activity: 'Coding.'
    })
  }
];

const conversations = [
  {
    uuid: uuidv4(),
    user_id: users[0].uuid,
    name: 'Project Discussion',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const messages = [
  {
    uuid: uuidv4(),
    conversation_uuid: conversations[0].uuid,
    role: 'user' as const,
    content_type: 'text' as const,
    content: 'Hi, can you help me with the project setup?',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    uuid: uuidv4(),
    conversation_uuid: conversations[0].uuid,
    role: 'assistant' as const,
    content_type: 'text' as const,
    content: "Sure! Let's get started. What framework are you using?",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const documents = [
  {
    uuid: uuidv4(),
    source_uuid: conversations[0].uuid,
    conversation_uuid: conversations[0].uuid,
    text: 'Project setup instructions...',
    metadata: JSON.stringify({
      title: 'Setup Guide',
      description: 'Instructions to set up the project',
      headers: [
        {
          h1: 'Introduction',
          h2: 'Requirements',
          h3: 'Installation',
          h4: '',
          h5: '',
          h6: ''
        }
      ],
      images: ['https://example.com/setup-image1.png'],
      links: ['https://example.com/setup-guide']
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const memories = [
  {
    uuid: uuidv4(),
    name: 'Project Ideas',
    category_uuid: categories[1].uuid,
    document_uuid: documents[0].uuid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const conversationMemories = [
  {
    conversation_uuid: conversations[0].uuid,
    memory_uuid: memories[0].uuid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const main = async () => {
  console.log('🌱 Seeding...');

  try {
    await db.insert(schema.tools).values(tools);
    console.log('✅ Tools seeded successfully');

    await db.insert(schema.categories).values(categories);
    console.log('✅ Categories seeded successfully');

    await db.insert(schema.users).values(users);
    console.log('✅ Users seeded successfully');

    await db.insert(schema.conversations).values(conversations);
    console.log('✅ Conversations seeded successfully');

    await db.insert(schema.messages).values(messages);
    console.log('✅ Messages seeded successfully');

    await db.insert(schema.documents).values(documents);
    console.log('✅ Documents seeded successfully');

    await db.insert(schema.memories).values(memories);
    console.log('✅ Memories seeded successfully');

    await db.insert(schema.conversationMemories).values(conversationMemories);
    console.log('✅ Conversation Memories seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding:', error);
  }
};

main();
