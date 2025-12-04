'use client';

/**
 * Welcome Modal Component
 * 
 * Onboarding modal for new users.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { X, Check } from 'lucide-react';
import { useState } from 'react';

interface WelcomeModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function WelcomeModal({ onClose, onComplete }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Digital Utopia',
      content: 'Your professional trading platform is ready. Let\'s get you started with a quick tour.',
      image: '🚀',
    },
    {
      title: 'Real-time Trading',
      content: 'Access live market data, execute trades instantly, and monitor your positions in real-time.',
      image: '📈',
    },
    {
      title: 'Advanced Charts',
      content: 'Professional charting tools with 50+ technical indicators and drawing tools.',
      image: '📊',
    },
    {
      title: 'Risk Management',
      content: 'Set stop losses, take profits, and manage your risk with our comprehensive tools.',
      image: '🛡️',
    },
  ];

  const handleComplete = () => {
    // Mark onboarding as complete
    localStorage.setItem('du-onboarding-complete', 'true');
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Welcome</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-foreground-secondary">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-xs text-foreground-secondary">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="text-6xl mb-4">{currentStepData.image}</div>
          <h3 className="text-lg font-semibold mb-3">{currentStepData.title}</h3>
          <p className="text-foreground-secondary leading-relaxed">
            {currentStepData.content}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Get Started
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}