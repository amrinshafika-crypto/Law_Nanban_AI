import { FormEvent, useState } from 'react';
import { Save, UserRound } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [barNumber, setBarNumber] = useState(profile?.bar_number || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage('');
    setError('');
    const { error: updateError } = await supabase.from('profiles').update({
      display_name: displayName.trim(),
      phone: phone.trim() || null,
      organization: organization.trim() || null,
      bar_number: barNumber.trim() || null,
    }).eq('id', profile.id);
    if (updateError) setError(`Could not save profile: ${updateError.message}`);
    else {
      await refreshProfile();
      setMessage('Profile updated.');
    }
    setSaving(false);
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Update the profile details associated with your account." />
      {!profile ? <EmptyState icon={<UserRound size={28} />} title="Profile unavailable" description="Profile settings could not be loaded for this account." /> : (
        <Card className="max-w-2xl p-5">
          <p className="text-sm text-navy-500 mb-5">{profile.email}</p>
          <form className="space-y-4" onSubmit={(event) => void save(event)}>
            <div><label className="label" htmlFor="display-name">Display name</label><input className="input" id="display-name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></div>
            <div><label className="label" htmlFor="bar-number">Bar registration number</label><input className="input" id="bar-number" value={barNumber} onChange={(event) => setBarNumber(event.target.value)} /></div>
            <div><label className="label" htmlFor="organization">Organization</label><input className="input" id="organization" value={organization} onChange={(event) => setOrganization(event.target.value)} /></div>
            <div><label className="label" htmlFor="phone">Phone</label><input className="input" id="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
            {message && <p role="status" className="text-sm text-success-700">{message}</p>}
            <button className="btn-primary" type="submit" disabled={saving}><Save size={16} />{saving ? 'Saving...' : 'Save profile'}</button>
          </form>
        </Card>
      )}
    </>
  );
}
