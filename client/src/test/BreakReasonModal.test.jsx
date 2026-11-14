import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BreakReasonModal from '../components/modals/BreakReasonModal';
import sessionApi from '../api/session.api';

// Mock session API
vi.mock('../api/session.api', () => ({
  default: {
    createBreakReason: vi.fn(),
  },
}));

describe('BreakReasonModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with all reason categories and submits upon tapping a category', async () => {
    sessionApi.createBreakReason.mockResolvedValueOnce({
      success: true,
      data: { reason: { category: 'phone' } },
    });

    const onSubmitted = vi.fn();
    const onClose = vi.fn();

    render(
      <BreakReasonModal
        isOpen={true}
        interruption={{
          eventId: 'evt_test_789',
          type: 'tab_switch',
          durationSec: 25,
        }}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );

    // Verify modal header is visible
    expect(screen.getByText(/What caused this study interruption/i)).toBeInTheDocument();

    // Find and click "Phone" category button
    const phoneButton = screen.getByRole('button', { name: /Phone/i });
    expect(phoneButton).toBeInTheDocument();

    fireEvent.click(phoneButton);

    await waitFor(() => {
      expect(sessionApi.createBreakReason).toHaveBeenCalledTimes(1);
      expect(sessionApi.createBreakReason).toHaveBeenCalledWith('evt_test_789', {
        category: 'phone',
        note: '',
      });
    });

    expect(onSubmitted).toHaveBeenCalledWith({
      eventId: 'evt_test_789',
      category: 'phone',
      note: '',
    });
    expect(onClose).toHaveBeenCalled();
  });
});
