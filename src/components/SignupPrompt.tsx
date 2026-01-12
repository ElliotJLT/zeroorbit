import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SignupPromptProps {
  exchangeCount: number;
  limit: number;
}

export default function SignupPrompt({ exchangeCount, limit }: SignupPromptProps) {
  const navigate = useNavigate();

  return (
    <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-md mx-auto text-center space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You've used {exchangeCount} of {limit} free messages
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            Create a free account to keep chatting
          </h3>
          <p className="text-sm text-muted-foreground">
            Track your progress, save sessions, and get unlimited help with your maths
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate('/auth?mode=signup')}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/auth?mode=login')}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
