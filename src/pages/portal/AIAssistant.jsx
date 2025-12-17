import React, { useState, useRef, useEffect } from 'react';
import { 
  AiOutlineSend, 
  AiOutlineRobot, 
  AiOutlineUser,
  AiOutlineBulb,
  AiOutlineFileText,
  AiOutlineTeam,
  AiOutlineSchedule,
  AiOutlineBarChart,
  AiOutlineSafety
} from 'react-icons/ai';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your Fortis Secured AI Assistant. I can help you with:\n\n• Analyzing security incidents and trends\n• Generating shift schedules and optimizing coverage\n• Providing guard performance insights\n• Creating reports and summaries\n• Answering questions about your operations\n\nHow can I assist you today?',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { 
      icon: AiOutlineBarChart, 
      text: 'Analyze this week\'s incidents', 
      prompt: 'Can you analyze the incidents from this week and provide insights on trends and recommendations?'
    },
    { 
      icon: AiOutlineSchedule, 
      text: 'Optimize next week\'s schedule', 
      prompt: 'Can you help optimize the shift schedule for next week based on site requirements and guard availability?'
    },
    { 
      icon: AiOutlineTeam, 
      text: 'Guard performance summary', 
      prompt: 'Provide a summary of guard performance this month including attendance, incident response, and areas for improvement.'
    },
    { 
      icon: AiOutlineFileText, 
      text: 'Generate operations report', 
      prompt: 'Generate a comprehensive operations report for this month including shifts, incidents, compliance, and financials.'
    },
  ];

  const simulateAIResponse = (userMessage) => {
    const responses = {
      'incidents': 'Based on the incident data from this week:\n\n📊 **Incident Analysis:**\n• Total incidents: 12\n• Most common type: Unauthorized access (5 incidents)\n• Peak time: Friday evening 18:00-22:00\n• Sites with most incidents: Central Mall (4), Office Tower B (3)\n\n💡 **Recommendations:**\n• Increase guard presence at Central Mall on Friday evenings\n• Review access control procedures\n• Consider additional training on conflict de-escalation\n\nWould you like me to create a detailed report or schedule additional shifts for high-risk times?',
      
      'schedule': '📅 **Schedule Optimization for Next Week:**\n\nBased on current requirements and guard availability:\n\n✅ **Recommended Changes:**\n• Move Michael Brown to Central Mall (Fri-Sun) - higher risk site\n• Assign Sophie Martinez to cover James Wilson\'s requested time off\n• Add David Anderson as backup supervisor for peak hours\n\n⚡ **Coverage Analysis:**\n• All sites covered 100%\n• Overtime reduced by 8 hours\n• Cost savings: £240\n\nShall I apply these changes to the schedule?',
      
      'performance': '👥 **Guard Performance Summary - December 2025**\n\n🌟 **Top Performers:**\n1. Michael Brown - 100% attendance, 8 incidents handled, excellent reports\n2. David Anderson - 98% attendance, strong leadership, 6 commendations\n3. Sophie Martinez - 100% attendance, detailed documentation\n\n⚠️ **Areas for Attention:**\n• James Wilson - Late 3 times this month\n• Thomas Johnson - Report quality needs improvement\n\n📈 **Overall Metrics:**\n• Average attendance: 96%\n• Incident response time: 4.2 minutes (target: 5 mins)\n• Client satisfaction: 4.8/5\n\nWould you like detailed individual reports?',
      
      'report': '📄 **Operations Report - December 2025**\n\n**Staffing:**\n• Active guards: 7\n• Total shifts: 156\n• Hours worked: 1,248\n• Overtime: 32 hours\n\n**Incidents:**\n• Total: 47 incidents\n• Response time: 4.2 min avg\n• Resolution rate: 94%\n\n**Compliance:**\n• SIA licenses: 100% valid\n• DBS checks: 100% cleared\n• Training: 85% completed\n\n**Financial:**\n• Revenue: £45,680\n• Costs: £32,450\n• Margin: 28.9%\n\n**Client Feedback:**\n• Average rating: 4.8/5\n• Renewal rate: 95%\n\nFull detailed report has been generated and is ready for export.',
      
      'default': 'I understand you\'re asking about that. As an AI assistant, I can help you with:\n\n• Analyzing security data and patterns\n• Optimizing schedules and resource allocation\n• Generating reports and insights\n• Answering operational questions\n\nCould you provide more specific details about what you\'d like assistance with?'
    };

    // Determine response based on keywords
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('incident') || lowerMessage.includes('analyze')) {
      return responses.incidents;
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('optimize')) {
      return responses.schedule;
    } else if (lowerMessage.includes('performance') || lowerMessage.includes('guard')) {
      return responses.performance;
    } else if (lowerMessage.includes('report') || lowerMessage.includes('generate')) {
      return responses.report;
    } else {
      return responses.default;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        role: 'assistant',
        content: simulateAIResponse(input),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickAction = (prompt) => {
    setInput(prompt);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Assistant</h1>
          <p className="mt-2 text-white/70">
            Get intelligent insights and assistance powered by AI
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-white/70">AI Online</span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                  <AiOutlineRobot className="text-xl text-white" />
                </div>
              )}
              
              <div
                className={`max-w-2xl rounded-2xl px-6 py-4 ${
                  message.role === 'user'
                    ? 'bg-accent text-white'
                    : 'bg-white/10 text-white border border-white/10'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                <div className="mt-2 text-xs opacity-50">
                  {new Date(message.timestamp).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                  <AiOutlineUser className="text-xl text-white" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4 justify-start">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                <AiOutlineRobot className="text-xl text-white" />
              </div>
              <div className="max-w-2xl rounded-2xl px-6 py-4 bg-white/10 border border-white/10">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-white/50 animate-bounce"></div>
                  <div className="h-2 w-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div className="border-t border-white/10 p-6">
            <p className="mb-4 text-sm font-medium text-white/70">Quick Actions:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-left text-sm text-white transition-all hover:bg-white/10 hover:border-accent"
                >
                  <action.icon className="text-xl text-accent flex-shrink-0" />
                  <span>{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-white/10 p-6">
          <div className="flex gap-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your security operations..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              rows="2"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex h-auto items-center justify-center rounded-lg bg-accent px-6 text-white transition-all hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AiOutlineSend className="text-xl" />
            </button>
          </div>
          <p className="mt-2 text-xs text-white/50">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
