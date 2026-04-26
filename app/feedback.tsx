import { Stack } from 'expo-router';
import FeedbackScreen from '../src/screens/FeedbackScreen';

export default function FeedbackPage() {
  return (
    <>
      <Stack.Screen options={{ title: 'Feedback', headerShown: false }} />
      <FeedbackScreen />
    </>
  );
}
