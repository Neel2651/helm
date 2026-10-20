import Link from 'next/link';
import ProjectForm from '../../../../components/ProjectForm';
import { saveProject } from '../../../actions';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  return (
    <>
      <header>
        <div className="text-muted-foreground text-sm"><Link href="/projects">Projects</Link> / New</div>
        <h1 className="mt-1">New project</h1>
      </header>
      <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
        <ProjectForm action={saveProject.bind(null, null)} submitLabel="Create project" />
      </div>
    </>
  );
}
