'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    surface: [] as string[],
    cushioning: '',
    budgetMin: 50,
    budgetMax: 200,
  });

  const surfaces = ['road', 'trail', 'track'];
  const cushioningOptions = [
    { value: 'minimal', label: 'Minimal' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'max', label: 'Max' },
  ];

  const handleSurfaceToggle = (surface: string) => {
    setAnswers(prev => ({
      ...prev,
      surface: prev.surface.includes(surface)
        ? prev.surface.filter(s => s !== surface)
        : [...prev.surface, surface],
    }));
  };

  const handleCushioningSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, cushioning: value }));
  };

  const handleBudgetChange = (field: 'budgetMin' | 'budgetMax', value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setAnswers(prev => ({ ...prev, [field]: num }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // On finish, map answers to search params and redirect
      const params = new URLSearchParams();
      if (answers.surface.length > 0) {
        params.set('surface', answers.surface.join(','));
      }
      if (answers.cushioning) {
        params.set('cushioning', answers.cushioning);
      }
      params.set('priceMin', answers.budgetMin.toString());
      params.set('priceMax', answers.budgetMax.toString());

      router.push('/search?' + params.toString());
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Shoe Recommendation Quiz</h1>
      <p className="text-gray-600 mb-8">Answer a few questions to get personalized shoe recommendations.</p>

      {/* Step indicator */}
      <div className="flex mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= i ? 'bg-black text-white' : 'bg-gray-200'}`}>
              {i}
            </div>
            {i < 3 && <div className={`w-12 h-1 ${step > i ? 'bg-black' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Surface */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">What surfaces do you run on?</h2>
          <p className="text-gray-600 mb-6">Select all that apply.</p>
          <div className="space-y-3">
            {surfaces.map(s => (
              <button
                key={s}
                onClick={() => handleSurfaceToggle(s)}
                className={`w-full text-left px-4 py-3 rounded-lg border ${answers.surface.includes(s) ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-50'}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Cushioning */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">What level of cushioning do you prefer?</h2>
          <p className="text-gray-600 mb-6">Choose one.</p>
          <div className="space-y-3">
            {cushioningOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleCushioningSelect(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-lg border ${answers.cushioning === opt.value ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-50'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Budget */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">What&apos;s your budget range? (USD)</h2>
          <p className="text-gray-600 mb-6">Enter minimum and maximum price.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Min Price</label>
              <input
                type="number"
                min="0"
                value={answers.budgetMin}
                onChange={e => handleBudgetChange('budgetMin', e.target.value)}
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Price</label>
              <input
                type="number"
                min="0"
                value={answers.budgetMax}
                onChange={e => handleBudgetChange('budgetMax', e.target.value)}
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>
          </div>
          <div className="mt-6 text-sm text-gray-500">
            <p>Your selected range: ${answers.budgetMin} - ${answers.budgetMax}</p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-10 flex justify-between">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-6 py-3 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          {step === 3 ? 'Finish & See Recommendations' : 'Next'}
        </button>
      </div>

      {/* Debug info (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 p-4 border rounded-lg bg-gray-50 text-sm">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <pre>{JSON.stringify(answers, null, 2)}</pre>
          <div className="mt-2">
            Current step: {step}
          </div>
        </div>
      )}
    </div>
  );
}
