/**
 * Component tests for FileUploader
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploader } from '@/components/FileUploader';

// Mock thinking-orbs since it's a canvas/WebGL component
jest.mock('thinking-orbs', () => ({
  ThinkingOrb: ({ 'aria-hidden': ariaHidden }: { 'aria-hidden'?: string }) => (
    <div data-testid="thinking-orb" aria-hidden={ariaHidden} />
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name: string, type = 'text/csv'): File {
  return new File(['a,b\n1,2'], name, { type });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('<FileUploader />', () => {
  const onUpload = jest.fn();

  beforeEach(() => {
    onUpload.mockClear();
  });

  it('renders the upload zone with correct aria label', () => {
    render(<FileUploader onUpload={onUpload} isUploading={false} />);
    expect(
      screen.getByRole('button', { name: /upload dataset file/i }),
    ).toBeInTheDocument();
  });

  it('shows upload prompt text when idle', () => {
    render(<FileUploader onUpload={onUpload} isUploading={false} />);
    expect(screen.getByText(/drop your dataset here/i)).toBeInTheDocument();
    expect(screen.getByText(/CSV · XLSX · XLS · JSON/i)).toBeInTheDocument();
  });

  it('shows "Profiling your dataset…" when isUploading is true', () => {
    render(<FileUploader onUpload={onUpload} isUploading={true} />);
    expect(screen.getByText(/profiling your dataset/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls onUpload with the selected .csv file', async () => {
    render(<FileUploader onUpload={onUpload} isUploading={false} />);
    const input = screen.getByLabelText(/choose a file to upload/i);
    const file = makeFile('sales.csv');

    await userEvent.upload(input, file);

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('calls onUpload with a .json file', async () => {
    render(<FileUploader onUpload={onUpload} isUploading={false} />);
    const input = screen.getByLabelText(/choose a file to upload/i);
    const file = makeFile('data.json', 'application/json');

    await userEvent.upload(input, file);
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('rejects an unsupported file type and shows an error alert', async () => {
    render(<FileUploader onUpload={onUpload} isUploading={false} />);
    const input = screen.getByLabelText(/choose a file to upload/i);
    const file = makeFile('notes.txt', 'text/plain');

    // fireEvent.change directly triggers React's onChange handler reliably in jsdom
    fireEvent.change(input, { target: { files: [file] } });

    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/unsupported format/i);
  });

  it('clears the type error when a valid file is chosen after an invalid one', async () => {
    render(<FileUploader onUpload={onUpload} isUploading={false} />);
    const input = screen.getByLabelText(/choose a file to upload/i);

    // Upload invalid file first — fireEvent.change to reliably trigger state update
    fireEvent.change(input, { target: { files: [makeFile('bad.pdf', 'application/pdf')] } });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Upload valid file — error should disappear
    fireEvent.change(input, { target: { files: [makeFile('good.csv')] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onUpload on file drop', async () => {
    render(<FileUploader onUpload={onUpload} isUploading={false} />);
    const dropZone = screen.getByRole('button', { name: /upload dataset file/i });
    const file = makeFile('dropped.csv');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('disables input when isUploading is true', () => {
    render(<FileUploader onUpload={onUpload} isUploading={true} />);
    const input = screen.getByLabelText(/choose a file to upload/i);
    expect(input).toBeDisabled();
  });
});
