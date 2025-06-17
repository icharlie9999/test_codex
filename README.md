# AI 语音助手 (AI Voice Assistant)

## 项目简介 (Project Introduction)

本项目是一个基于 Web 的 AI 语音助手应用，旨在为用户（特别是老年人）提供一个通过语音交互的便捷工具。用户可以选择一个卡通人物作为聊天伙伴，并通过语音指令实现多种实用功能。

This project is a web-based AI voice assistant application designed to provide users (especially the elderly) with a convenient tool for voice interaction. Users can choose a cartoon character as a chat partner and access various practical functions through voice commands.

## 当前功能 (Current Features)

*   **卡通人物选择 (Cartoon Character Selection):** 用户可以从几个可爱的卡通人物中选择一个作为他们的语音助手形象。
*   **实时语音聊天 (Real-time Voice Chat):** 基本的语音转文字 (STT) 和文字转语音 (TTS) 功能，允许用户与选定的卡通人物进行对话。
*   **网络查询 (Web Search):** 用户可以通过语音指令进行网络搜索 (例如，“搜索今天的天气”)，应用会在新的浏览器标签页中打开百度搜索结果。
*   **用药提醒 (Medication Reminders):**
    *   设置提醒: 用户可以设置一次性或每日的用药提醒 (例如，“提醒我明天上午9点吃药” 或 “设置每天下午3点吃药提醒”)。
    *   触发提醒: 应用会在设定的时间通过语音和聊天消息提醒用户。
    *   确认提醒: 用户可以通过语音确认或取消当次的提醒 (例如，“好的，知道了” 或 “取消提醒”)。
*   **通讯录管理 (Contact Book Management):**
    *   添加联系人: 用户可以通过语音添加联系人及其电话号码 (例如，“添加联系人张三，电话是13812345678”)。
    *   查询联系人: 用户可以通过语音查询已存联系人的电话号码 (例如，“查询联系人张三” 或 “张三的电话号码是多少？”)。

## 如何使用 (How to Use)

1.  **浏览器要求 (Browser Requirements):**
    *   建议使用最新版本的现代浏览器，如 Google Chrome 或 Microsoft Edge，这些浏览器对 Web Speech API (语音识别和合成) 的支持较好。
    *   Ensure you are using a modern browser like Google Chrome or Microsoft Edge, which have good support for the Web Speech API.
2.  **麦克风权限 (Microphone Permission):**
    *   首次使用语音输入功能时，浏览器会请求麦克风使用权限。请务必点击“允许”，否则语音识别将无法工作。
    *   When using the voice input feature for the first time, your browser will ask for microphone permission. Please click "Allow".
3.  **打开应用 (Open the Application):**
    *   在浏览器中打开 `index.html` 文件。
    *   Open the `index.html` file in your browser.
4.  **选择卡通人物 (Select a Character):**
    *   点击页面上您喜欢的卡通人物图片。选中的人物会高亮显示，并用语音向您问好。
    *   Click on your preferred cartoon character image. The selected character will be highlighted and greet you via voice.
5.  **开始语音交互 (Start Voice Interaction):**
    *   点击“开始语音输入”按钮。
    *   当按钮下方提示“正在聆听...”时，请说出您的指令。
    *   Click the "Start Voice Input" button. Speak your command when the prompt below the button says "Listening...".

## 语音指令示例 (Example Voice Commands)

*   **网络查询 (Web Search):**
    *   “搜索北京今天的天气” (Search for Beijing's weather today)
    *   “查一下红烧肉怎么做” (Look up how to make braised pork)
*   **用药提醒 (Medication Reminders):**
    *   “提醒我明天上午9点吃药” (Remind me to take medicine at 9 AM tomorrow)
    *   “设置每天下午三点十五分吃降压药的提醒” (Set a reminder to take blood pressure medication at 3:15 PM every day)
    *   (当提醒响起时 When reminder triggers) “好的，知道了” (Okay, got it) / “取消提醒” (Cancel reminder)
*   **通讯录 (Contact Book):**
    *   “添加联系人李明，他的电话是13987654321” (Add contact Li Ming, his phone number is 13987654321)
    *   “查询联系人李明” (Query contact Li Ming)
    *   “李明的电话号码是多少？” (What is Li Ming's phone number?)
*   **一般对话 (General Conversation):**
    *   (说任何内容，助手会简单复述和回应 You can say anything, and the assistant will provide a basic reply)

## 未来功能 (Future Features)

*   待办事项记录 (To-do List Management)
*   定时播报感兴趣的新闻 (Scheduled News Broadcasting)
*   更完善的设置页面 (Comprehensive Settings Page)
*   更自然的对话流程 (More natural conversation flow)

---
欢迎提出改进建议！(Contributions and suggestions are welcome!)