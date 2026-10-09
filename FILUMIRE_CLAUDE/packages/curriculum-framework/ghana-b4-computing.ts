import type { CurriculumNode } from "./index";

const NACCA_B4_COMPUTING_SOURCE =
  "NaCCA Computing Curriculum for Primary Schools, Basic 4-6, 2019";

const nodeId = (code: string) =>
  `node-gh-b4-computing-${code.toLowerCase()}`;

const node = (
  subjectId: string,
  parentNodeId: string | undefined,
  nodeType: CurriculumNode["nodeType"],
  code: string,
  title: string,
  order: number,
): CurriculumNode => ({
  id: nodeId(code),
  subjectId,
  parentNodeId,
  nodeType,
  code,
  title,
  sourceReference: NACCA_B4_COMPUTING_SOURCE,
  order,
});

export function getGhanaB4ComputingNodes(
  subjectId: string,
): CurriculumNode[] {
  const nodes: CurriculumNode[] = [];

  const addStrand = (code: string, title: string, order: number) =>
    nodes.push(node(subjectId, undefined, "strand", code, title, order));

  const addSubStrand = (
    parentCode: string,
    code: string,
    title: string,
    order: number,
  ) =>
    nodes.push(
      node(subjectId, nodeId(parentCode), "sub_strand", code, title, order),
    );

  const addStandard = (
    parentCode: string,
    code: string,
    title: string,
    order: number,
  ) =>
    nodes.push(
      node(
        subjectId,
        nodeId(parentCode),
        "content_standard",
        code,
        title,
        order,
      ),
    );

  const addIndicator = (
    parentCode: string,
    code: string,
    title: string,
    order: number,
  ) =>
    nodes.push(
      node(
        subjectId,
        nodeId(parentCode),
        "learning_indicator",
        code,
        title,
        order,
      ),
    );

  addStrand("B4.1", "Introduction to Computing", 1);

  addSubStrand(
    "B4.1",
    "B4.1.1",
    "Generation of Computers and Parts of a Computer and Other Gadgets",
    1,
  );
  addStandard(
    "B4.1.1",
    "B4.1.1.1",
    "Identify parts of a computer and technology tools",
    1,
  );
  addIndicator(
    "B4.1.1.1",
    "B4.1.1.1.1",
    "Identify parts of a computer and technology tools",
    1,
  );
  addIndicator(
    "B4.1.1.1",
    "B4.1.1.1.2",
    "Describe types of input devices and their uses",
    2,
  );
  addIndicator(
    "B4.1.1.1",
    "B4.1.1.1.3",
    "Differentiate between RAM and ROM",
    3,
  );
  addIndicator(
    "B4.1.1.1",
    "B4.1.1.1.4",
    "Type short phrases",
    4,
  );
  addIndicator(
    "B4.1.1.1",
    "B4.1.1.1.5",
    "Summarise the first generation of computers",
    5,
  );

  addSubStrand(
    "B4.1",
    "B4.1.2",
    "Introduction to MS-Windows Interface",
    2,
  );
  addStandard(
    "B4.1.2",
    "B4.1.2.1",
    "Demonstrate the use of the Desktop Background as well as working with folders",
    1,
  );
  addIndicator(
    "B4.1.2.1",
    "B4.1.2.1.1",
    "Describe desktop background and explain its features",
    1,
  );
  addIndicator(
    "B4.1.2.1",
    "B4.1.2.1.2",
    "Demonstrate how to personalise the Desktop Background",
    2,
  );
  addIndicator(
    "B4.1.2.1",
    "B4.1.2.1.3",
    "Demonstrate the use of Taskbar sections",
    3,
  );
  addIndicator(
    "B4.1.2.1",
    "B4.1.2.1.4",
    "Add and remove icons from the desktop",
    4,
  );
  addIndicator(
    "B4.1.2.1",
    "B4.1.2.1.5",
    "Move, select and hide multiple icons on the desktop",
    5,
  );
  addIndicator(
    "B4.1.2.1",
    "B4.1.2.1.6",
    "Create, name and rename a folder",
    6,
  );

  addSubStrand("B4.1", "B4.1.3", "Data, Sources and Usage", 3);
  addStandard(
    "B4.1.3",
    "B4.1.3.1",
    "Identify Data and collect data from different sources",
    1,
  );
  addIndicator(
    "B4.1.3.1",
    "B4.1.3.1.1",
    "Use strategies for identifying data in conversation and newspapers",
    1,
  );
  addIndicator(
    "B4.1.3.1",
    "B4.1.3.1.2",
    "Use strategies for classifying data into information",
    2,
  );
  addIndicator(
    "B4.1.3.1",
    "B4.1.3.1.3",
    "Identify primary sources of information",
    3,
  );
  addIndicator(
    "B4.1.3.1",
    "B4.1.3.1.4",
    "Demonstrate sending and sharing information to and from gadgets",
    4,
  );
  addIndicator(
    "B4.1.3.1",
    "B4.1.3.1.5",
    "Demonstrate basic calculations on sample data",
    5,
  );

  addStandard(
    "B4.1.3",
    "B4.1.3.2",
    "Demonstrate data collection using Data collection tools",
    2,
  );
  addIndicator(
    "B4.1.3.2",
    "B4.1.3.2.1",
    "Identify steps and issues involved in data collection",
    1,
  );
  addIndicator(
    "B4.1.3.2",
    "B4.1.3.2.2",
    "Describe various tools and techniques of data collection",
    2,
  );
  addIndicator(
    "B4.1.3.2",
    "B4.1.3.2.3",
    "Draw or sketch maps of the area to be surveyed",
    3,
  );

  addSubStrand(
    "B4.1",
    "B4.1.4",
    "Technology in the Community (Communication)",
    4,
  );
  addStandard(
    "B4.1.4",
    "B4.1.4.1",
    "Demonstrate the use of technology in the community",
    1,
  );
  addIndicator(
    "B4.1.4.1",
    "B4.1.4.1.1",
    "Describe how digital systems are or could be used at home, school and in the local community",
    1,
  );
  addIndicator(
    "B4.1.4.1",
    "B4.1.4.1.2",
    "Identify common energy-efficient gadgets and techniques used at home, school and in the community",
    2,
  );
  addIndicator(
    "B4.1.4.1",
    "B4.1.4.1.3",
    "Describe how digital systems and peripherals can be used for different community purposes",
    3,
  );
  addIndicator(
    "B4.1.4.1",
    "B4.1.4.1.4",
    "Identify technological changes in the community",
    4,
  );

  addStrand("B4.2", "Presentation", 2);
  addSubStrand(
    "B4.2",
    "B4.2.1",
    "Introduction to MS-PowerPoint",
    1,
  );
  addStandard(
    "B4.2.1",
    "B4.2.1.1",
    "Demonstrate the use of MS-PowerPoint",
    1,
  );
  addIndicator(
    "B4.2.1.1",
    "B4.2.1.1.1",
    "Demonstrate the use of clipboard, slides, fonts, paragraph and editing in the Home ribbon",
    1,
  );
  addIndicator(
    "B4.2.1.1",
    "B4.2.1.1.2",
    "Show a three-slide presentation using the tools studied",
    2,
  );

  addStrand("B4.3", "Word Processing", 3);
  addSubStrand(
    "B4.3",
    "B4.3.1",
    "Introduction to Word Processing",
    1,
  );
  addStandard(
    "B4.3.1",
    "B4.3.1.1",
    "Demonstrate understanding of the use of word processing application",
    1,
  );
  addIndicator(
    "B4.3.1.1",
    "B4.3.1.1.1",
    "Demonstrate how to use clipboard, styles, fonts, paragraph and editing",
    1,
  );
  addIndicator(
    "B4.3.1.1",
    "B4.3.1.1.2",
    "Illustrate the use of clipboard, styles, fonts, paragraph and editing",
    2,
  );

  return nodes;
}
