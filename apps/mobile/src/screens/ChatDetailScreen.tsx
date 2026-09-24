import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Conversation, Message } from '@null/shared';
import { MobileApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const ChatDetailScreen: React.FC<{
  conversation: Conversation;
  onBack: () => void;
}> = ({ conversation, onBack }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const isRoom = conversation.type === 'ROOM';
  const title = isRoom ? conversation.title : conversation.recipient?.displayName || conversation.recipient?.username;

  const loadMessages = async () => {
    try {
      const data = await MobileApiClient.get<Message[]>(`/api/messages?conversationId=${conversation.id}`);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  const handleSend = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    const text = content.trim();
    setContent('');
    try {
      const newMsg = await MobileApiClient.post<Message>('/api/messages', {
        conversationId: conversation.id,
        content: text,
      });
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      setContent(text);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSelf = item.senderId === user?.id;
    return (
      <View style={[styles.bubbleWrapper, isSelf ? styles.selfWrapper : styles.peerWrapper]}>
        <View style={[styles.bubble, isSelf ? styles.selfBubble : styles.peerBubble]}>
          {!isSelf && <Text style={styles.senderText}>@{item.sender?.username}</Text>}
          <Text style={styles.messageText}>{item.isDeleted ? 'Deleted message' : item.content}</Text>
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>
            {isRoom ? `${conversation.members.length} members` : conversation.recipient?.isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Transmit message..."
          placeholderTextColor="#5A5E69"
          value={content}
          onChangeText={setContent}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={!content.trim() || loading}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C0E',
  },
  header: {
    height: 56,
    backgroundColor: '#121316',
    borderBottomWidth: 1,
    borderColor: '#252830',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    color: '#F0F1F3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#F0F1F3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#5A5E69',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
  },
  bubbleWrapper: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  selfWrapper: {
    justifyContent: 'flex-end',
  },
  peerWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 8,
  },
  selfBubble: {
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: '#333742',
  },
  peerBubble: {
    backgroundColor: '#121316',
    borderWidth: 1,
    borderColor: '#252830',
  },
  senderText: {
    color: '#8E929B',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  messageText: {
    color: '#F0F1F3',
    fontSize: 13,
    lineHeight: 18,
  },
  timeText: {
    color: '#5A5E69',
    fontSize: 9,
    fontFamily: 'monospace',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#121316',
    borderTopWidth: 1,
    borderColor: '#252830',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E2026',
    borderColor: '#252830',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F0F1F3',
    fontSize: 13,
    maxHeight: 90,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#F0F1F3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
  },
  sendButtonText: {
    color: '#0B0C0E',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
