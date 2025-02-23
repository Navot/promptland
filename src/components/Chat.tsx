import { useRef, useState, useEffect } from 'react'
import { useMessages } from '../store/messages' // Adjust import based on your store structure

function Chat() {
  const messages = useMessages(state => state.messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isUserScrolled, setIsUserScrolled] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      })
    }
  }

  const handleScroll = () => {
    if (!chatContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsUserScrolled(!isAtBottom)
  }

  useEffect(() => {
    // Scroll to bottom when new message is added
    if (!isUserScrolled) {
      scrollToBottom()
    }
  }, [messages.length])

  useEffect(() => {
    // Scroll to bottom on initial load
    scrollToBottom('instant')
  }, [])

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      onScroll={handleScroll}
    >
      {messages.map((message, index) => (
        <div key={message.id} className="message">
          {/* Your message component */}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default Chat 