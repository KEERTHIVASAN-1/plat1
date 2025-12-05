import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

const Timer = ({ startTime, endTime, status, onTimeUp }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!startTime && !endTime) return;

    const calculateTimeRemaining = () => {
      const now = Date.now();
      let remaining = 0;
      if (endTime) {
        const end = new Date(endTime).getTime();
        remaining = Math.floor((end - now) / 1000);
      }

      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsExpired(true);
        if (onTimeUp) onTimeUp();
        return 0;
      }

      setTimeRemaining(remaining);
      return remaining;
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime, status, onTimeUp]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining === 0) return 'text-red-600';
    if (timeRemaining < 300) return 'text-orange-600'; // Less than 5 minutes
    return 'text-green-600';
  };

  if (!startTime && !endTime) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Clock className="h-5 w-5" />
        <span className="font-mono text-lg">--:--</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Clock className={`h-5 w-5 ${getTimeColor()}`} />
      <span className={`font-mono text-lg font-semibold ${getTimeColor()}`}>
        {formatTime(timeRemaining)}
      </span>
      {isExpired && (
        <AlertCircle className="h-5 w-5 text-red-600 animate-pulse" />
      )}
    </div>
  );
};

export default Timer;
