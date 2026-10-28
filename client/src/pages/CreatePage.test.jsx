import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CreatePage } from './CreatePage.jsx';

describe('CreatePage', () => {
  it('shows the difficulty options and their required case counts', () => {
    render(<MemoryRouter><CreatePage /></MemoryRouter>);

    expect(screen.getByRole('radio', { name: /easy/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /easy/i }).closest('label')).toHaveTextContent('3 suspects · 5 clues');
    expect(screen.getByRole('radio', { name: /medium/i }).closest('label')).toHaveTextContent('4 suspects · 7 clues');
    expect(screen.getByRole('radio', { name: /hard/i }).closest('label')).toHaveTextContent('5 suspects · 9 clues');
    expect(screen.getByText('3 hints available during the investigation')).toBeInTheDocument();
  });

  it('validates an empty scenario before attempting to contact the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    render(<MemoryRouter><CreatePage /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /create my mystery/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Add a few details about the mystery you have in mind.');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('shows the public case summary after a successful creation response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { case: {
        title: 'The Quiet Observatory',
        summary: 'A chart is missing from a locked room.',
        difficulty: 'medium',
        suspects: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
        clues: Array.from({ length: 7 }, (_, index) => ({ id: String(index) })),
        hintLimit: 3,
      } } }),
    });
    const user = userEvent.setup();
    render(<MemoryRouter><CreatePage /></MemoryRouter>);

    await user.type(screen.getByLabelText('Describe your mystery'), 'A chart vanishes from a locked observatory.');
    await user.click(screen.getByRole('button', { name: /create my mystery/i }));

    expect(await screen.findByRole('heading', { name: 'The Quiet Observatory' })).toBeInTheDocument();
    expect(screen.getByText('4 suspects · 7 clues · 3 hints')).toBeInTheDocument();
    expect(screen.getByText(/generated cases are not saved/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open the case archive/i })).toHaveAttribute('href', '/cases');
    vi.restoreAllMocks();
  });

  it('clearly labels a prebuilt fallback and links directly into its investigation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {
        caseId: 'fixture-easy-last-bell',
        generation: { method: 'prebuilt_fixture_fallback', reason: 'GENERATION_PROVIDER_UNAVAILABLE' },
        case: {
          id: 'fixture-easy-last-bell',
          title: 'The Last Bell',
          summary: 'A bronze bell vanished during a concert.',
          difficulty: 'easy',
          suspects: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
          clues: Array.from({ length: 5 }, (_, index) => ({ id: String(index) })),
          hintLimit: 2,
        },
      } }),
    });
    const user = userEvent.setup();
    render(<MemoryRouter><CreatePage /></MemoryRouter>);

    await user.type(screen.getByLabelText('Describe your mystery'), 'A bell disappears from a locked museum gallery.');
    await user.click(screen.getByRole('button', { name: /create my mystery/i }));

    expect(await screen.findByText(/prebuilt fallback case/i)).toBeInTheDocument();
    expect(screen.getByText(/gemini could not complete this request/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play this fallback case/i })).toHaveAttribute('href', '/investigation/fixture-easy-last-bell');
    vi.restoreAllMocks();
  });
});
