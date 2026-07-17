import { Solution } from 'src/app/models/solution';

import { ProblemListViewComponent } from './problem-list-view.component';

describe('ProblemListViewComponent filters', () => {
  let component: ProblemListViewComponent;

  beforeEach(() => {
    component = Object.create(
      ProblemListViewComponent.prototype
    ) as ProblemListViewComponent;
    component.solutions = [
      { solutionId: 'pending', title: 'Pending idea', finished: 'false' },
      { solutionId: 'submitted', title: 'Submitted idea', finished: 'true' },
      {
        solutionId: 'legacy-submitted',
        title: 'Legacy submitted idea',
        finished: true,
      } as unknown as Solution,
    ];
    component.filteredSolutions = [];
    component.searchTerm = '';
    component.solutionFilter = 'all';
  });

  it('shows every solution by default', () => {
    component.applySolutionFilters();

    expect(component.filteredSolutions.map((solution) => solution.solutionId)).toEqual([
      'pending',
      'submitted',
      'legacy-submitted',
    ]);
  });

  it('shows only pending solutions after selecting Pending', () => {
    component.setSolutionFilter('pending');

    expect(component.filteredSolutions.map((solution) => solution.solutionId)).toEqual([
      'pending',
    ]);
  });

  it('shows only submitted solutions after selecting Submitted', () => {
    component.setSolutionFilter('submitted');

    expect(component.filteredSolutions.map((solution) => solution.solutionId)).toEqual([
      'submitted',
      'legacy-submitted',
    ]);
  });
});
