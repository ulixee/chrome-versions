export class DependenciesMissingError extends Error {
  constructor(resolutionMessage: string, readonly fullversion:string, readonly missingDependencies: string[]) {
    super(
      `Some of the dependencies needed to run Chrome ${fullversion} are not on your system!\n\n${resolutionMessage}`,
    );
    this.name = 'DependenciesMissingError';
  }
}
