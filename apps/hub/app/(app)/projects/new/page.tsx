import Link from 'next/link';
import ProjectForm from '../../../../components/ProjectForm';
import { saveProject } from '../../../actions';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  return (
    <>
      <header>
        <div className="muted small"><Link href="/projects">Projects</Link> / New</div>
        <h1 style={{ marginTop: 4 }}>New project</h1>
      </header>
      <div className="card">
        <ProjectForm action={saveProject.bind(null, null)} submitLabel="Create project" />
      </div>
    </>
  );
}
