import React, { useState, useRef, useEffect } from 'react';
import '../CSS/IncidentReporting.css';
import { API_BASE } from '../config';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hi! I'm your AI Emergency Assistant. How can I help you stay safe today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I'm having trouble connecting to the emergency database." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: "Connection error. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`ai-assistant-container ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <div className="ai-toggle-wrapper">
          <div className="ai-tooltip">Need help? Ask AI!</div>
          <button className="ai-toggle-btn" onClick={() => setIsOpen(true)}>
            <img src="/ai_robot_avatar.png" alt="AI Assistant" className="ai-robot-img" />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="ai-chat-window" ref={chatWindowRef}>
          <div className="ai-chat-header">
            <div className="ai-title">
              <i className="fas fa-robot"></i>
              <span>Emergency AI</span>
            </div>
            <button className="close-ai-btn" onClick={() => setIsOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <div className="message-content">
                  {msg.text.split('\n').map((line, i) => (
                    <span key={i}>{line}<br/></span>
                  ))}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message ai">
                <div className="message-content typing-indicator">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="ai-chat-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask for emergency guidance..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
