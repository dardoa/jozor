import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonIdentityEdit } from '../PersonIdentityEdit';
import { createPerson } from '../../../../../utils/familyLogic';
import { en } from '../../../../../utils/translations/en';

const media = vi.hoisted(() => ({ isUploading: false, handleUpload: vi.fn(), handleDelete: vi.fn() }));
vi.mock('../../../../../hooks/utils/usePhotoUpload', () => ({ usePhotoUpload: () => media }));
vi.mock('../../../../../context/TranslationContext', () => ({ useTranslation: () => ({ t: en }) }));
vi.mock('../../../../../components/ui/SmartAvatar', () => ({ SmartAvatar: () => <span>Photo</span> }));

describe('person photo controls', () => {
  beforeEach(() => { vi.clearAllMocks(); media.isUploading = false; });

  it('opens the chooser with the keyboard and keeps delete outside the upload button', async () => {
    const user = userEvent.setup();
    const person = { ...createPerson(), id: 'test-person', photoUrl: 'https://example.test/photo.png' };
    const { container } = render(<PersonIdentityEdit person={person} onUpdate={vi.fn()} />);
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Photo input missing');
    const choose = vi.spyOn(fileInput, 'click').mockImplementation(() => undefined);
    const upload = screen.getByRole('button', { name: en.uploadPhoto });
    upload.focus();
    await user.keyboard('{Enter}');
    expect(choose).toHaveBeenCalledOnce();
    const remove = screen.getByRole('button', { name: en.removePhoto });
    expect(upload).not.toContainElement(remove);
    remove.focus();
    await user.keyboard('{Enter}');
    expect(media.handleDelete).toHaveBeenCalledWith(person.id);
    expect(choose).toHaveBeenCalledOnce();
    expect(remove).toHaveClass('focus-visible:opacity-100');
  });

  it('disables selection and removal while a photo is uploading', () => {
    media.isUploading = true;
    render(<PersonIdentityEdit person={{ ...createPerson(), photoUrl: 'https://example.test/photo.png' }} onUpdate={vi.fn()} />);
    const upload = screen.getByRole('button', { name: en.uploadPhoto });
    expect(upload).toBeDisabled();
    expect(upload).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button', { name: en.removePhoto })).not.toBeInTheDocument();
    fireEvent.click(upload);
    expect(media.handleUpload).not.toHaveBeenCalled();
  });
});
