import type { InstructionalStrategy } from "../../packages/domain";
import type { LearningContent } from "../../packages/content";
import {
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS,
} from "../../packages/curriculum/ghana-b4-computing-adaptive";

type Evidence = {
  diagnostic: [string, string, string[]];
  reassessment: [string, string, string[]];
  retention: [string, string, string[]];
  transfer: [string, string, string[]];
  lesson: string;
  practice: string;
  scaffold: string;
  remediation: string;
};

const SOURCE =
  "NaCCA Computing Curriculum for Primary Schools, Basic 4-6, 2019";

const now = new Date().toISOString();

const evidence: Record<string, Evidence> = {};
evidence["B4.1.1.1.1"] = {
  diagnostic: [
    "Which computer part displays text, pictures and other information?",
    "Monitor",
    ["Monitor", "Keyboard", "Mouse", "Speaker"],
  ],
  reassessment: [
    "Ama wants to see the work she is doing on a computer. Which part should she look at?",
    "Monitor",
    ["Monitor", "Keyboard", "Mouse", "System unit"],
  ],
  retention: [
    "Which device is mainly used to move the pointer on a computer screen?",
    "Mouse",
    ["Mouse", "Monitor", "Speaker", "Printer"],
  ],
  transfer: [
    "A school is setting up a computer. Learners need to type, point at items and view their work. Which group of parts supports these three tasks?",
    "Keyboard, mouse and monitor",
    ["Keyboard, mouse and monitor", "Monitor, speaker and printer", "Mouse, speaker and printer", "System unit, speaker and printer"],
  ],
  lesson:
    "A computer system has different parts with different purposes. The monitor displays information, the keyboard enters text, the mouse controls the pointer, and the system unit contains important internal components. Peripherals such as speakers add other functions.",
  practice:
    "Identify the monitor, keyboard, mouse and system unit of a computer and state one basic purpose of each.",
  scaffold:
    "Look at what each part helps the user do: view information, type, point and select, process information, or hear sound.",
  remediation:
    "Do not call every computer part the computer. Identify each part separately and connect it with its particular function.",
};

evidence["B4.1.1.1.2"] = {
  diagnostic: [
    "Which of these is an input device?",
    "Mouse",
    ["Mouse", "Monitor", "Speaker", "Projector"],
  ],
  reassessment: [
    "Kojo wants to control movement in a computer game. Which input device could he use?",
    "Joystick",
    ["Joystick", "Speaker", "Monitor", "Printer"],
  ],
  retention: [
    "What is the main purpose of an input device?",
    "To send data or instructions into a computer",
    ["To send data or instructions into a computer", "To display information only", "To print documents only", "To produce sound only"],
  ],
  transfer: [
    "A learner needs to point directly at objects on a compatible screen. Which type of device would be appropriate?",
    "A pointing input device such as a light pen",
    ["A pointing input device such as a light pen", "A speaker", "A printer", "A monitor only"],
  ],
  lesson:
    "Input devices allow a user to send data and instructions to a computer. Examples include the mouse, joystick, light pen and pointing stick. Different input devices are suited to different forms of interaction.",
  practice:
    "Name three input devices and explain one use for each.",
  scaffold:
    "Ask whether the device sends something into the computer or receives something from it. If it sends user actions or data into the system, it is an input device.",
  remediation:
    "Do not classify a device by appearance alone. Focus on its direction of communication: input devices send data or commands into the computer.",
};

evidence["B4.1.1.1.3"] = {
  diagnostic: [
    "Which statement correctly describes RAM?",
    "RAM temporarily holds information being used by the computer",
    ["RAM temporarily holds information being used by the computer", "RAM is a permanent paper record", "RAM is an output device", "RAM and ROM always perform exactly the same role"],
  ],
  reassessment: [
    "Which memory is normally used for information the computer is actively working with?",
    "RAM",
    ["RAM", "ROM", "Monitor", "Keyboard"],
  ],
  retention: [
    "What is one basic difference between RAM and ROM?",
    "RAM is temporary working memory while ROM stores information intended to remain available",
    ["RAM is temporary working memory while ROM stores information intended to remain available", "RAM is a mouse and ROM is a keyboard", "Both are output devices", "There is no difference"],
  ],
  transfer: [
    "A computer loses temporary working information when power is removed, but some built-in instructions remain available. Which memory types best explain this?",
    "RAM for the temporary information and ROM for the built-in information",
    ["RAM for the temporary information and ROM for the built-in information", "ROM for both", "RAM for both", "A monitor and keyboard"],
  ],
  lesson:
    "RAM and ROM are types of computer memory with different roles. RAM provides temporary working memory for information currently being used. ROM stores information designed to remain available without serving as ordinary temporary working memory.",
  practice:
    "State one characteristic of RAM and one characteristic of ROM, then explain how they differ.",
  scaffold:
    "Think temporary working memory for RAM and information intended to remain available for ROM.",
  remediation:
    "Do not treat RAM and ROM as identical or confuse them with devices such as hard drives, monitors or keyboards. Compare their memory roles directly.",
};

evidence["B4.1.1.1.4"] = {
  diagnostic: [
    "Which key is normally used to create a space between two words?",
    "Spacebar",
    ["Spacebar", "Enter", "Shift", "Backspace"],
  ],
  reassessment: [
    "Which typed phrase correctly uses spaces between its words?",
    "My school library",
    ["My school library", "Myschoollibrary", "M y s c h o o l", "My  schoollibrary"],
  ],
  retention: [
    "What should you check after typing a short phrase?",
    "That the letters, spaces and punctuation are correct",
    ["That the letters, spaces and punctuation are correct", "That every letter has a space after it", "That Enter was pressed after every word", "That all letters are capitals"],
  ],
  transfer: [
    "You are typing the phrase Ghana is beautiful. What combination of skills helps you enter it correctly?",
    "Correct letters, spaces and appropriate capitalisation and punctuation",
    ["Correct letters, spaces and appropriate capitalisation and punctuation", "Using Enter between every word", "Using the spacebar between every letter", "Typing only capital letters"],
  ],
  lesson:
    "Typing a short phrase requires locating the correct keys, entering letters in order, placing spaces between words and using basic capitalisation and punctuation where needed.",
  practice:
    "Type three short phrases and check each one for correct letters, spaces, capitalisation and punctuation.",
  scaffold:
    "Work one word at a time. Type the letters, use the spacebar once between words, and then check the whole phrase.",
  remediation:
    "The spacebar separates words, not individual letters. Enter normally starts a new line rather than creating an ordinary space between words.",
};

evidence["B4.1.1.1.5"] = {
  diagnostic: [
    "Which technology is strongly associated with first generation computers?",
    "Vacuum tubes",
    ["Vacuum tubes", "Modern microprocessors", "Touch screens", "Cloud storage"],
  ],
  reassessment: [
    "Which of these is an example of a first generation computer?",
    "ENIAC",
    ["ENIAC", "Smartphone", "Tablet computer", "Modern laptop"],
  ],
  retention: [
    "Which group contains examples associated with first generation computers?",
    "ENIAC, EDVAC and UNIVAC",
    ["ENIAC, EDVAC and UNIVAC", "Smartphone, tablet and smartwatch", "Mouse, keyboard and monitor", "Windows, PowerPoint and Word"],
  ],
  transfer: [
    "A historical computer is described as very large and dependent on vacuum tubes rather than modern microprocessors. To which generation does it belong?",
    "First generation",
    ["First generation", "Modern generation only", "It is not a computer", "A generation defined by touch screens"],
  ],
  lesson:
    "First generation computers used vacuum tubes as a major electronic technology. They were large compared with modern computers. Examples commonly studied include ENIAC, EDVAC, UNIVAC and IBM-701.",
  practice:
    "Name two first generation computers and state the technology strongly associated with that generation.",
  scaffold:
    "Connect three ideas: early electronic computers, vacuum tubes, and examples such as ENIAC, EDVAC, UNIVAC and IBM-701.",
  remediation:
    "Do not describe first generation computers using modern microprocessors or current personal-computer features. Their defining historical technology was the vacuum tube.",
};
evidence["B4.1.2.1.1"] = {
  diagnostic: [
    "Which feature normally appears on a computer desktop?",
    "Icons",
    ["Icons", "Keyboard keys", "Printer paper", "USB cable only"],
  ],
  reassessment: [
    "What is the bar commonly found along an edge of the Windows desktop called?",
    "Taskbar",
    ["Taskbar", "Keyboard", "Folder", "Document"],
  ],
  retention: [
    "Which three features can commonly be identified on a Windows desktop?",
    "Background, icons and taskbar",
    ["Background, icons and taskbar", "Mouse, printer and scanner", "RAM, ROM and hard drive", "Keyboard, speaker and microphone"],
  ],
  transfer: [
    "A learner sees a background image, several small symbols for programs and a bar containing controls. What computer area is being described?",
    "The desktop",
    ["The desktop", "The keyboard", "The system unit", "A printed document"],
  ],
  lesson:
    "The computer desktop is the main working area shown after the operating system starts. Common desktop features include the background image, icons and the taskbar.",
  practice:
    "Look at a computer desktop and identify its background, three icons and the taskbar.",
  scaffold:
    "Separate the desktop into visible parts: the large background area, the small icons and the taskbar.",
  remediation:
    "The desktop is not the physical table holding the computer. It is the main on-screen working area containing features such as icons and the taskbar.",
};

evidence["B4.1.2.1.2"] = {
  diagnostic: [
    "What does personalising a desktop background change?",
    "The appearance of the desktop background",
    ["The appearance of the desktop background", "The contents of every file", "The computer memory type", "The keyboard layout automatically"],
  ],
  reassessment: [
    "Which action is appropriate when changing a desktop background?",
    "Choose a background in personalisation settings and apply it",
    ["Choose a background in personalisation settings and apply it", "Delete all desktop files", "Remove the monitor", "Rename every folder"],
  ],
  retention: [
    "After selecting a new desktop background, what should you do?",
    "Apply the setting and check that the background changed",
    ["Apply the setting and check that the background changed", "Delete the image", "Restart every application", "Remove all icons"],
  ],
  transfer: [
    "A learner previews a new background but the desktop does not change. What should the learner check?",
    "Whether the new setting was applied",
    ["Whether the new setting was applied", "Whether the keyboard was removed", "Whether all files were deleted", "Whether the monitor became an input device"],
  ],
  lesson:
    "Desktop personalisation changes the appearance of the desktop. A learner can open the appropriate settings, select a background, apply the choice and verify that the change has taken effect.",
  practice:
    "Using an available computer or demonstration, describe the steps for selecting and applying a different desktop background.",
  scaffold:
    "Follow the sequence: open personalisation settings, choose the background, apply the setting, then verify the result.",
  remediation:
    "Changing the desktop background changes its appearance. It does not delete files or change the contents of documents.",
};

evidence["B4.1.2.1.3"] = {
  diagnostic: [
    "Which part of the taskbar can be used to begin finding and launching applications?",
    "Start menu",
    ["Start menu", "Desktop background", "Document page", "Keyboard cable"],
  ],
  reassessment: [
    "Where would you commonly look for the date, time and volume controls on the taskbar?",
    "Notification or system tray area",
    ["Notification or system tray area", "Inside the keyboard", "Desktop wallpaper only", "Inside a printed document"],
  ],
  retention: [
    "What does a pinned application on the taskbar provide?",
    "Quick access to the application",
    ["Quick access to the application", "Permanent deletion of the application", "A replacement for the monitor", "A new computer memory type"],
  ],
  transfer: [
    "An application disappears from the screen after you minimise it but its taskbar indicator remains. What does this mean?",
    "The application is still open but minimised",
    ["The application is still open but minimised", "The application has been deleted", "The computer has shut down", "The taskbar has become a file"],
  ],
  lesson:
    "The taskbar provides access to important controls. The Start menu helps locate and launch applications, pinned applications provide quick access, and the notification area can show information such as date, time and volume.",
  practice:
    "Identify the Start menu, a pinned application and the notification area on a taskbar and explain one purpose of each.",
  scaffold:
    "Divide the taskbar into functions: starting or finding applications, quick application access, and system information or controls.",
  remediation:
    "A minimised application is not necessarily closed, and a pinned application is not necessarily running. Learn what each taskbar state represents.",
};

evidence["B4.1.2.1.4"] = {
  diagnostic: [
    "What is a desktop icon?",
    "A small on-screen symbol representing an item such as an application, file or shortcut",
    ["A small on-screen symbol representing an item such as an application, file or shortcut", "A physical key on the keyboard", "A computer memory chip", "A type of printer paper"],
  ],
  reassessment: [
    "If you remove a shortcut icon from the desktop, what does that usually mean?",
    "The desktop shortcut is removed without necessarily uninstalling the application",
    ["The desktop shortcut is removed without necessarily uninstalling the application", "The monitor stops working", "All computer files are erased", "The keyboard becomes disconnected"],
  ],
  retention: [
    "Why might a learner add an icon to the desktop?",
    "To make an item easier to access",
    ["To make an item easier to access", "To increase RAM", "To change the monitor into an input device", "To delete the operating system"],
  ],
  transfer: [
    "A program still exists on a computer after its desktop shortcut is removed. What does this demonstrate?",
    "Removing a shortcut does not necessarily remove the program",
    ["Removing a shortcut does not necessarily remove the program", "Every icon is the complete program itself", "The program has become a folder", "The computer no longer has software"],
  ],
  lesson:
    "Desktop icons provide visual access to items such as applications, files, folders and shortcuts. Icons can be added or removed from the desktop without every such action changing the underlying program or file.",
  practice:
    "Demonstrate or describe how an appropriate desktop icon can be added and removed, then verify the result.",
  scaffold:
    "First identify what the icon represents. Then distinguish changing the desktop icon from changing or deleting the underlying item.",
  remediation:
    "Do not assume that removing every desktop icon deletes the application or file it represents. A shortcut and the underlying item are not always the same thing.",
};

evidence["B4.1.2.1.5"] = {
  diagnostic: [
    "What happens when you move a desktop icon?",
    "Its position on the desktop changes",
    ["Its position on the desktop changes", "The application is automatically deleted", "The monitor turns off", "The file contents are rewritten"],
  ],
  reassessment: [
    "Which task requires selecting more than one desktop icon at the same time?",
    "Moving several selected icons together",
    ["Moving several selected icons together", "Reading the clock", "Changing speaker volume", "Typing one letter"],
  ],
  retention: [
    "If desktop icons are hidden, what has happened to them?",
    "They are not currently displayed on the desktop",
    ["They are not currently displayed on the desktop", "They have all been permanently deleted", "They have become RAM", "They have been printed"],
  ],
  transfer: [
    "A teacher wants a cleaner desktop during a presentation without deleting any shortcuts. Which action is appropriate?",
    "Hide the desktop icons",
    ["Hide the desktop icons", "Delete every application", "Remove the monitor", "Erase the computer storage"],
  ],
  lesson:
    "Desktop icons can be selected, moved and hidden. Multiple selection allows several icons to be managed together. Hiding icons changes their visibility rather than necessarily deleting them.",
  practice:
    "Practise selecting one icon, selecting multiple icons, moving selected icons and hiding or showing desktop icons.",
  scaffold:
    "Distinguish the actions: select chooses an icon, move changes its position, and hide changes whether it is visible.",
  remediation:
    "Moving or hiding an icon is not the same as deleting it. Check what changed: selection, position, visibility or existence.",
};

evidence["B4.1.2.1.6"] = {
  diagnostic: [
    "What is a folder mainly used for on a computer?",
    "Organising files and other items",
    ["Organising files and other items", "Displaying the desktop background", "Controlling speaker volume", "Replacing the keyboard"],
  ],
  reassessment: [
    "You already have a folder called Work and want it to be called School Work. Which action should you use?",
    "Rename the folder",
    ["Rename the folder", "Create several new folders", "Delete the monitor", "Change the desktop background"],
  ],
  retention: [
    "Does renaming a folder normally change the files stored inside it?",
    "No, renaming changes the folder name rather than its contents",
    ["No, renaming changes the folder name rather than its contents", "Yes, all files are automatically deleted", "Yes, all files become pictures", "Yes, the folder becomes RAM"],
  ],
  transfer: [
    "A learner wants one place to organise files for a class project. What should the learner create and then give an appropriate name?",
    "A folder",
    ["A folder", "A taskbar", "A desktop background", "A memory chip"],
  ],
  lesson:
    "Folders help organise files and other items. A folder can be created, given a meaningful name and renamed later without normally changing the contents stored inside it.",
  practice:
    "Create a folder, give it a suitable name, and then rename it while checking that its contents remain unchanged.",
  scaffold:
    "Use the sequence: create the folder, enter a meaningful name, locate it, then use rename when the name needs to change.",
  remediation:
    "A folder is a container used to organise items. Renaming an existing folder is different from creating another folder, and it does not normally alter the files inside.",
};
evidence["B4.1.3.1.1"] = {
  diagnostic: ["Which of these is an example of data?", "The recorded names and ages of learners in a class", ["The recorded names and ages of learners in a class", "A guess with no observation", "An empty page", "A computer cable"]],
  reassessment: ["A newspaper reports daily temperatures for Accra. What are the recorded temperatures?", "Data", ["Data", "Computer hardware", "Folders", "Input devices"]],
  retention: ["Can words as well as numbers be data?", "Yes, recorded words and categories can also be data", ["Yes, recorded words and categories can also be data", "No, data can only be numbers", "No, data must be pictures", "Only computer files are data"]],
  transfer: ["During a conversation, five learners state how they travel to school. What can their recorded responses become?", "Data for analysis", ["Data for analysis", "Computer memory", "Desktop icons", "Input hardware"]],
  lesson: "Data consists of recorded facts, observations or values that can be collected and examined. Data may include numbers, words, categories and other recorded observations from sources such as conversations and newspapers.",
  practice: "Find three examples of data in a short conversation or newspaper report and explain why each is data.",
  scaffold: "Look for facts, values, names, categories or observations that have been recorded and can be examined.",
  remediation: "Data is not limited to numbers. Recorded words, categories and observations can also serve as data.",
};

evidence["B4.1.3.1.2"] = {
  diagnostic: ["What does classifying data involve?", "Grouping data according to a consistent rule or characteristic", ["Grouping data according to a consistent rule or characteristic", "Deleting all the data", "Changing every value", "Putting items into random groups"]],
  reassessment: ["A class groups fruits as citrus and non-citrus. What are they doing with the data?", "Classifying it", ["Classifying it", "Deleting it", "Printing it", "Encrypting it"]],
  retention: ["Why can sorting and classifying data be useful?", "They help organise data so patterns and information can be understood", ["They help organise data so patterns and information can be understood", "They make all data identical", "They remove the need for data", "They turn data into hardware"]],
  transfer: ["A teacher has a list of learners and their favourite sports. To find the most common sport, what should be done first?", "Group or classify the responses by sport", ["Group or classify the responses by sport", "Delete repeated sports", "Rename the learners", "Change the responses randomly"]],
  lesson: "Raw data can be sorted and classified according to useful characteristics. Organising related data helps people interpret it and turn it into useful information.",
  practice: "Take a small set of familiar data and group it using one clear classification rule.",
  scaffold: "Choose the characteristic first, then place items sharing that characteristic into the same group.",
  remediation: "Do not group data randomly. A useful classification follows a consistent rule that helps the data become easier to understand.",
};

evidence["B4.1.3.1.3"] = {
  diagnostic: ["Which source can provide direct evidence about an event?", "A photograph taken during the event", ["A photograph taken during the event", "An unrelated advertisement", "A blank sheet", "A computer mouse"]],
  reassessment: ["Which item could provide information recorded directly by someone about their own experiences?", "A diary", ["A diary", "A keyboard", "A desktop icon", "A printer cable"]],
  retention: ["Which of these can serve as an information source?", "An audio recording", ["An audio recording", "Only a desktop background", "Only RAM", "Only a mouse pointer"]],
  transfer: ["Learners are researching what community elders remember about an earlier event. Which source could give them direct recorded accounts?", "Oral histories or interviews with the elders", ["Oral histories or interviews with the elders", "An unrelated computer game", "A desktop wallpaper", "A blank checklist"]],
  lesson: "Information can come from many sources, including photographs, audio and video recordings, letters, diaries, speeches, books, newspapers, government publications and oral histories.",
  practice: "List four different information sources and state one kind of information each could provide.",
  scaffold: "Ask who or what recorded the information, what form the record takes, and how it relates to the topic being studied.",
  remediation: "Information does not come only from digital devices. Written, visual, audio and oral records can all provide information.",
};

evidence["B4.1.3.1.4"] = {
  diagnostic: ["Which technology can be used to send a written message electronically?", "SMS on a mobile phone", ["SMS on a mobile phone", "A disconnected monitor", "A paper-only folder", "RAM by itself"]],
  reassessment: ["What is happening when one person sends an SMS to another person's phone?", "Information is being transmitted between devices", ["Information is being transmitted between devices", "The information is only being stored", "The phones become printers", "The message becomes computer memory"]],
  retention: ["Which activity is an example of sharing information through technology?", "Making a telephone call", ["Making a telephone call", "Turning off an unused monitor", "Renaming a folder", "Moving a desktop icon"]],
  transfer: ["A community worker needs to quickly tell several colleagues about a meeting. Which action demonstrates electronic information sharing?", "Sending them messages using a communication device", ["Sending them messages using a communication device", "Changing the desktop wallpaper", "Creating an empty folder", "Increasing screen brightness"]],
  lesson: "Communication technologies allow information to be sent and shared. Examples include telephone calls, SMS and other communication systems.",
  practice: "Identify three technologies used to communicate information and describe what kind of information each can send or receive.",
  scaffold: "Identify the message, the sending method or device, and the person or device receiving the information.",
  remediation: "Sending information is different from merely storing it. Communication involves transmitting information from one point or person to another.",
};

evidence["B4.1.3.1.5"] = {
  diagnostic: ["What is the sum of 10, 20 and 30?", "60", ["60", "20", "30", "600"]],
  reassessment: ["Three learners scored 6, 8 and 10. What is their average score?", "8", ["8", "24", "6", "10"]],
  retention: ["If 5 out of 20 learners choose football, what percentage of the learners is that?", "25%", ["25%", "5%", "20%", "40%"]],
  transfer: ["A survey records 12, 18 and 30 books read by three groups. What is the average number of books read?", "20", ["20", "60", "30", "15"]],
  lesson: "Basic calculations help make sense of numerical data. A sum combines values, an average is found by dividing a total by the number of values, and a percentage expresses a part in relation to one hundred.",
  practice: "Using a small set of numbers, calculate the sum and average, then find a simple percentage from a part and a total.",
  scaffold: "For a sum, add the values. For an average, add them and divide by how many values there are. For a percentage, compare the part with the whole and express it out of one hundred.",
  remediation: "Do not confuse the total with the average. The average requires both the sum and the number of values, while a percentage compares a part with a whole.",
};
evidence["B4.1.3.2.1"] = {
  diagnostic: ["What should be done before collecting data?", "Identify the reason or goal for collecting it", ["Identify the reason or goal for collecting it", "Collect random information", "Change the results", "Ignore the purpose"]],
  reassessment: ["Which sequence best describes a simple data collection process?", "Set a goal, plan a method, collect data, interpret it", ["Set a goal, plan a method, collect data, interpret it", "Collect, delete, guess, finish", "Interpret before collecting", "Change data before planning"]],
  retention: ["Which problem can reduce the quality of collected data?", "Intentional manipulation of data", ["Intentional manipulation of data", "Using a clear goal", "Planning the method", "Recording observations carefully"]],
  transfer: ["A class wants to find how learners travel to school. What should they decide before beginning the survey?", "The purpose and method of collecting the data", ["The purpose and method of collecting the data", "The final answer before collecting data", "Which responses to remove", "How to change unwanted results"]],
  lesson: "Good data collection begins with a clear reason or goal. A suitable method is planned, data is collected and interpreted, and problems such as unavailable data, manipulation and random errors must be considered.",
  practice: "Plan a simple class data collection activity by stating its goal, method, information to collect and one possible problem.",
  scaffold: "Use four stages: identify the reason, set the goal, plan the method, then collect and interpret the data.",
  remediation: "Do not begin collecting information without a clear purpose. Poor planning, missing data, manipulation and errors can make conclusions unreliable.",
};

evidence["B4.1.3.2.2"] = {
  diagnostic: ["Which of these is a data collection technique?", "Interview", ["Interview", "Desktop wallpaper", "RAM", "Taskbar"]],
  reassessment: ["A learner watches and records how many vehicles pass the school gate. Which technique is being used?", "Observation", ["Observation", "Interview", "Renaming", "Formatting"]],
  retention: ["Which tool can help a learner mark whether specific items or conditions were observed?", "Checklist", ["Checklist", "Desktop icon", "Speaker", "Wallpaper"]],
  transfer: ["A class wants to learn why learners prefer particular school meals. Which technique would allow them to ask learners directly?", "Interview", ["Interview", "Observation only", "Desktop personalisation", "Folder renaming"]],
  lesson: "Different data collection tasks require suitable tools and techniques. Interviews gather responses by asking questions, observation records what is seen, and checklists help record whether specified items or conditions are present.",
  practice: "Choose interview, observation or checklist for three different data collection situations and explain each choice.",
  scaffold: "Ask what information is needed. Use an interview for direct responses, observation for visible events or behaviour, and a checklist for recording specified items consistently.",
  remediation: "Do not choose a data collection technique simply because it is familiar. Match the technique to the type of information required.",
};

evidence["B4.1.3.2.3"] = {
  diagnostic: ["What can a simple survey map show?", "The location of important features in the area being surveyed", ["The location of important features in the area being surveyed", "Only computer passwords", "The amount of RAM", "The desktop background"]],
  reassessment: ["What should a useful sketch map include?", "Relevant landmarks or features and their relative locations", ["Relevant landmarks or features and their relative locations", "Random drawings with no locations", "Only written paragraphs", "Computer icons only"]],
  retention: ["Why is a sketch map useful during a survey?", "It helps record where important features are located", ["It helps record where important features are located", "It automatically collects every type of data", "It replaces all interviews", "It changes survey results"]],
  transfer: ["Learners are surveying waste bins around their school. What could they add to a sketch map?", "The approximate locations of the waste bins", ["The approximate locations of the waste bins", "Unrelated computer passwords", "The names of every computer file", "Random shapes with no meaning"]],
  lesson: "A sketch map represents an area simply enough to show important features and their relative locations. It can support a survey by helping learners record where observations or resources are found.",
  practice: "Draw a simple sketch map of a familiar area and mark several features relevant to a small survey.",
  scaffold: "Begin with the area boundary or main route, add recognisable landmarks, then mark the features important to the survey.",
  remediation: "A survey map does not need every detail of the area, but its locations and symbols should be meaningful enough to support the investigation.",
};
evidence["B4.1.4.1.1"] = {
  diagnostic: ["Where can digital systems be used?", "At home, school and in the community", ["At home, school and in the community", "Only in computer laboratories", "Only in banks", "Only outside Ghana"]],
  reassessment: ["Which is an example of a digital system being used at school?", "Using a computer to prepare learning materials", ["Using a computer to prepare learning materials", "Writing only with chalk", "Opening a window", "Moving a desk"]],
  retention: ["Why are digital systems used in different places?", "They help people perform useful tasks and manage information", ["They help people perform useful tasks and manage information", "They replace every human activity", "They are only for games", "They work without any purpose"]],
  transfer: ["A clinic uses computers to organise patient information. What does this demonstrate?", "Use of a digital system to support a community service", ["Use of a digital system to support a community service", "Desktop decoration", "Computer generation history", "Folder renaming"]],
  lesson: "Digital systems are used at home, school and throughout the community to communicate, manage information, support learning and perform many practical tasks.",
  practice: "Identify one digital system used at home, one at school and one in the community, and explain the purpose of each.",
  scaffold: "For each place, identify a digital device or system, then ask what task it helps people perform.",
  remediation: "Digital systems are not limited to computer laboratories. They appear in many everyday activities and community services.",
};

evidence["B4.1.4.1.2"] = {
  diagnostic: ["Which action can help reduce unnecessary electricity use?", "Switching off an unused device", ["Switching off an unused device", "Leaving every device running", "Increasing brightness unnecessarily", "Keeping unused equipment powered all day"]],
  reassessment: ["Which is an example of energy-efficient technology use?", "Using power-saving settings when appropriate", ["Using power-saving settings when appropriate", "Leaving unused screens on", "Ignoring energy consumption", "Running unnecessary devices"]],
  retention: ["Why are energy-efficient gadgets useful?", "They can perform tasks while reducing unnecessary energy use", ["They can perform tasks while reducing unnecessary energy use", "They always use more electricity", "They cannot perform useful tasks", "They remove the need for electricity"]],
  transfer: ["A school wants to reduce electricity waste in its computer room. Which practice would help?", "Switch off unused equipment and use energy-saving settings", ["Switch off unused equipment and use energy-saving settings", "Leave every device on overnight", "Increase screen brightness to maximum", "Run unused equipment continuously"]],
  lesson: "Energy-efficient gadgets and responsible techniques help reduce unnecessary energy use. Examples include efficient devices, power-saving settings and switching off equipment when it is not needed.",
  practice: "Identify three gadgets or techniques that can help save energy at home, school or in the community.",
  scaffold: "Ask whether the device or behaviour performs the needed task while avoiding unnecessary electricity use.",
  remediation: "Energy efficiency is not simply avoiding technology. It means using suitable technology and operating it responsibly with less wasted energy.",
};

evidence["B4.1.4.1.3"] = {
  diagnostic: ["What is a peripheral device?", "A device connected to a computer system to provide additional input, output or other functions", ["A device connected to a computer system to provide additional input, output or other functions", "Only the desktop background", "A type of data", "A survey method"]],
  reassessment: ["Which device could a community office use to produce paper copies of documents?", "Printer", ["Printer", "Mouse pad", "Desktop wallpaper", "RAM"]],
  retention: ["Why are different digital systems and peripherals chosen for different tasks?", "Their functions suit different purposes", ["Their functions suit different purposes", "Every device performs exactly the same task", "Only their colour matters", "Peripherals have no purpose"]],
  transfer: ["A community centre wants to display information from a computer to a large audience. Which peripheral would be useful?", "Projector", ["Projector", "Mouse", "Keyboard", "Memory chip"]],
  lesson: "Digital systems combine hardware and software to perform tasks. Peripherals such as printers, scanners, speakers and projectors extend what a system can do for different community purposes.",
  practice: "Match four digital devices or peripherals with suitable community uses.",
  scaffold: "Start with the task, such as printing, scanning, displaying or producing sound, then select the device designed for that function.",
  remediation: "Do not assume all peripherals perform the same job. Select hardware according to the task that needs to be completed.",
};

evidence["B4.1.4.1.4"] = {
  diagnostic: ["Which is an example of technological change in a community?", "Automated irrigation", ["Automated irrigation", "A handwritten title", "Moving a desktop icon", "Renaming a folder"]],
  reassessment: ["How can automated irrigation change farming?", "It can help control the delivery of water to crops", ["It can help control the delivery of water to crops", "It removes all need for water", "It turns crops into computers", "It only changes desktop backgrounds"]],
  retention: ["Why do communities adopt new technologies?", "To improve or change how useful tasks are performed", ["To improve or change how useful tasks are performed", "To make every task harder", "Only to change device colours", "To eliminate all human decisions"]],
  transfer: ["Farmers begin using a system that automatically supplies water to crops at selected times. What does this illustrate?", "Technological change in the community", ["Technological change in the community", "Word processing", "Desktop personalisation", "Computer memory"]],
  lesson: "Technology changes how people perform activities in their communities. Examples include automated irrigation and technologies that support more efficient or environmentally responsible farming practices.",
  practice: "Identify two technological changes in a community and explain how each has changed the way a task is performed.",
  scaffold: "Compare how a task was performed before and after the technology was introduced.",
  remediation: "Technological change means more than owning a new device. Focus on how technology changes or improves the way a real task is performed.",
};
evidence["B4.2.1.1.1"] = {
  diagnostic: ["Which PowerPoint ribbon contains tools such as Clipboard, Slides, Font, Paragraph and Editing?", "Home", ["Home", "View", "Help", "File only"]],
  reassessment: ["Which Home ribbon group is used to change the appearance of text?", "Font", ["Font", "Slides", "Clipboard", "Editing"]],
  retention: ["Which group helps organise text alignment and bullets?", "Paragraph", ["Paragraph", "Clipboard", "Slides", "Editing"]],
  transfer: ["A learner wants to copy text and paste it onto another slide. Which Home ribbon group is most relevant?", "Clipboard", ["Clipboard", "Paragraph", "Slides", "Editing"]],
  lesson: "The PowerPoint Home ribbon contains groups including Clipboard, Slides, Font, Paragraph and Editing. Each group provides tools for particular presentation tasks.",
  practice: "Open PowerPoint and identify the Clipboard, Slides, Font, Paragraph and Editing groups on the Home ribbon.",
  scaffold: "Match each task to its group: copy and paste with Clipboard, slide operations with Slides, text appearance with Font, text arrangement with Paragraph, and searching or selecting with Editing.",
  remediation: "Do not treat the Home ribbon as one tool. It contains groups of related commands for different presentation tasks.",
};

evidence["B4.2.1.1.2"] = {
  diagnostic: ["How many slides are required in the presentation activity described in this indicator?", "Three", ["Three", "One", "Ten", "Twenty"]],
  reassessment: ["What should a learner demonstrate while creating the three-slide presentation?", "Use of the studied Home ribbon tools", ["Use of the studied Home ribbon tools", "Only changing the desktop background", "Only creating folders", "Only using the taskbar"]],
  retention: ["Which feature helps make text on a slide clearer and more suitable for presentation?", "Appropriate font and paragraph formatting", ["Appropriate font and paragraph formatting", "Random formatting", "Deleting all text", "Hiding the presentation"]],
  transfer: ["A learner is preparing three slides about the school environment. What should be used to organise and format the presentation?", "Relevant Slides, Font, Paragraph, Clipboard and Editing tools", ["Relevant Slides, Font, Paragraph, Clipboard and Editing tools", "Only desktop icons", "Only RAM and ROM", "Only folder names"]],
  lesson: "A short presentation combines slide creation with appropriate use of Clipboard, Slides, Font, Paragraph and Editing tools. The tools should support clear communication rather than decoration alone.",
  practice: "Create a three-slide presentation on a familiar topic and use appropriate Home ribbon tools to organise and format it.",
  scaffold: "Create the three slides first, add the required information, then check text formatting, paragraph arrangement and any copy or editing actions.",
  remediation: "A presentation is not complete simply because slides exist. The studied tools should be applied appropriately so the information is organised and readable.",
};

evidence["B4.3.1.1.1"] = {
  diagnostic: ["Which word-processing group commonly contains copy and paste commands?", "Clipboard", ["Clipboard", "Paragraph", "Styles", "Font"]],
  reassessment: ["Which group is mainly used to change features such as font size and text emphasis?", "Font", ["Font", "Clipboard", "Editing", "Paragraph"]],
  retention: ["Which word-processing group can be used to control alignment and paragraph layout?", "Paragraph", ["Paragraph", "Clipboard", "Font", "Editing"]],
  transfer: ["A learner needs to find a particular word in a long document. Which group contains relevant editing tools?", "Editing", ["Editing", "Font", "Clipboard", "Styles"]],
  lesson: "Word-processing applications provide groups of tools for creating and editing documents. Clipboard handles actions such as copy and paste, Font controls text appearance, Paragraph controls arrangement, Styles applies consistent formatting, and Editing supports tasks such as finding text.",
  practice: "Open a word-processing application and identify Clipboard, Styles, Font, Paragraph and Editing tools.",
  scaffold: "Match the task to the tool group: moving or copying content, changing text appearance, arranging paragraphs, applying styles, or locating and editing text.",
  remediation: "Do not choose commands by position alone. Identify the task first, then select the word-processing tool designed for that task.",
};

evidence["B4.3.1.1.2"] = {
  diagnostic: ["What is the best reason for using formatting tools in a document?", "To organise and present information clearly", ["To organise and present information clearly", "To make every word different", "To delete the document", "To turn the document into hardware"]],
  reassessment: ["A heading needs to stand out from ordinary paragraph text. Which tool could help?", "An appropriate style or font formatting", ["An appropriate style or font formatting", "Desktop wallpaper", "Taskbar settings", "RAM"]],
  retention: ["What should guide the use of font, paragraph and style tools?", "The purpose and readability of the document", ["The purpose and readability of the document", "Random decoration", "Using every available command", "Changing formatting after every word"]],
  transfer: ["A learner is preparing a one-page notice for a school event. What combination of tools would help create a clear document?", "Appropriate Clipboard, Font, Paragraph, Styles and Editing tools", ["Appropriate Clipboard, Font, Paragraph, Styles and Editing tools", "Only desktop icons", "Only PowerPoint slides", "Only computer memory"]],
  lesson: "Word-processing tools work together to create clear documents. Learners can copy or move content, format text, organise paragraphs, apply suitable styles and edit information according to the purpose of the document.",
  practice: "Create a short document and demonstrate appropriate use of Clipboard, Font, Paragraph, Styles and Editing tools.",
  scaffold: "Enter the information first, then improve its organisation: format the heading, arrange paragraphs, apply suitable styles and check the text.",
  remediation: "Formatting should improve communication. Avoid random changes that make the document inconsistent or difficult to read.",
};

function slug(code: string): string {
  return code.toLowerCase().replace(/\./g, "-");
}

function assessment(
  competencyId: string,
  code: string,
  purpose: string,
  title: string,
  item: [string, string, string[]],
  assessmentPurpose: string,
  diagnosticRules?: Record<string, unknown>,
): LearningContent {
  const [question, expectedResponse, options] = item;

  return {
    id: `content-gh-b4-computing-${slug(code)}-${purpose}`,
    competencyId,
    type: "assessment",
    title,
    body: question,
    language: "en",
    assessmentStrategy: "multiple_choice",
    assessmentItemId: `item-gh-b4-computing-${slug(code)}-${purpose}`,
    metadata: {
      options: JSON.stringify(options),
      expectedResponse,
      assessmentPurpose,
      curriculumNodeCode: code,
      curriculumSource: SOURCE,
      ...(diagnosticRules
        ? { diagnosticRules: JSON.stringify(diagnosticRules) }
        : {}),
    },
    version: "computing-adaptive-1.0",
    createdAt: now,
    updatedAt: now,
  };
}

function instruction(
  competencyId: string,
  code: string,
  suffix: string,
  type: "lesson" | "practice" | "scaffold" | "remediation",
  title: string,
  body: string,
  teachingStrategy: InstructionalStrategy,
): LearningContent {
  return {
    id: `content-gh-b4-computing-${slug(code)}-${suffix}`,
    competencyId,
    type,
    title,
    body,
    language: "en",
    teachingStrategy,
    metadata: {
      curriculumNodeCode: code,
      curriculumSource: SOURCE,
    },
    version: "computing-adaptive-1.0",
    createdAt: now,
    updatedAt: now,
  };
}

export const GHANA_B4_COMPUTING_GENERATED_CONTENT: LearningContent[] =
  GHANA_B4_COMPUTING_ADAPTIVE_SPECS.flatMap((spec) => {
    const code = spec.indicatorMappings.find(
      (mapping) => mapping.relationship === "direct",
    )?.code;

    if (!code) {
      throw new Error(
        `Missing direct B4 Computing indicator mapping for ${spec.competencyId}.`,
      );
    }

    const authored = evidence[code];

    if (!authored) {
      throw new Error(
        `Missing authored B4 Computing adaptive evidence for ${code}.`,
      );
    }

    const diagnosticRules: Record<string, unknown> = {};

    spec.misconceptions.slice(0, 3).forEach((misconception, index) => {
      const distractor = authored.diagnostic[2][index + 1];

      if (distractor) {
        diagnosticRules[distractor] = {
          errorPattern: misconception,
          diagnosticState: "conceptual_misunderstanding",
          diagnosticConfidence: 0.8,
        };
      }
    });

    return [
      assessment(spec.competencyId, code, "diagnostic", `${spec.title} Diagnostic`, authored.diagnostic, "diagnostic", diagnosticRules),
      instruction(spec.competencyId, code, "lesson", "lesson", spec.title, authored.lesson, "direct_explanation"),
      instruction(spec.competencyId, code, "practice", "practice", `${spec.title} Practice`, authored.practice, "guided_practice"),
      instruction(spec.competencyId, code, "scaffold", "scaffold", `${spec.title} Step by Step`, authored.scaffold, "step_by_step_scaffold"),
      instruction(spec.competencyId, code, "remediation", "remediation", `${spec.title} Misconception Repair`, authored.remediation, "error_analysis"),
      assessment(spec.competencyId, code, "reassessment", `${spec.title} Reassessment`, authored.reassessment, "reassessment"),
      assessment(spec.competencyId, code, "retention", `${spec.title} Retention Check`, authored.retention, "retention"),
      assessment(spec.competencyId, code, "transfer", `${spec.title} Transfer Check`, authored.transfer, "transfer"),
    ];
  });

if (GHANA_B4_COMPUTING_GENERATED_CONTENT.length !== 216) {
  throw new Error(
    `Expected 216 B4 Computing content records, found ${GHANA_B4_COMPUTING_GENERATED_CONTENT.length}.`,
  );
}
