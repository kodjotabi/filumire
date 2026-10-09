import type {
  CurriculumNode,
  FrameworkSubjectId,
} from "./index";

const NACCA_B4_MATH_SOURCE =
  "NaCCA Mathematics Curriculum for Primary Schools, Basic 4-6, September 2019";

function id(code: string): string {
  return `node-gh-b4-math-${code.toLowerCase()}`;
}

function node(
  subjectId: FrameworkSubjectId,
  code: string,
  nodeType: CurriculumNode["nodeType"],
  title: string,
  order: number,
  parentNodeId?: string,
): CurriculumNode {
  return {
    id: id(code),
    subjectId,
    parentNodeId,
    nodeType,
    code,
    title,
    sourceReference: NACCA_B4_MATH_SOURCE,
    order,
  };
}

/*
 * Additional authoritative NaCCA Basic 4 Mathematics nodes.
 *
 * B4.2, B4.2.1, B4.2.1.1, B4.2.1.1.1-.3,
 * B4.2.1.3 and B4.2.1.3.1-.2 already exist in
 * curriculum-framework/index.ts with historical stable IDs.
 *
 * They are deliberately NOT recreated here.
 */

export function getGhanaB4MathematicsAdditionalNodes(
  subjectId: FrameworkSubjectId,
): CurriculumNode[] {
  return [
    /*
     * STRAND 1: NUMBER
     */

    node(
      subjectId,
      "B4.1",
      "strand",
      "Number",
      1,
    ),

    node(
      subjectId,
      "B4.1.1",
      "sub_strand",
      "Whole Numbers: Counting and Representation",
      1,
      id("B4.1"),
    ),

    node(
      subjectId,
      "B4.1.1.1",
      "content_standard",
      "Demonstrate an understanding of quantities and place value for multi-digit whole numerals up to 100,000.",
      1,
      id("B4.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.1.1",
      "learning_indicator",
      "Model number quantities and place value for multi-digit whole numerals using graph sheets or multi-base materials up to 100,000.",
      1,
      id("B4.1.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.1.2",
      "learning_indicator",
      "Read and write numbers in figures and in words up to 100,000.",
      2,
      id("B4.1.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.1.3",
      "learning_indicator",
      "Identify numbers in different positions around a given number in a number chart.",
      3,
      id("B4.1.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.1.4",
      "learning_indicator",
      "Compare and order whole numbers up to 10,000 and represent comparisons using the symbols <, = and >.",
      4,
      id("B4.1.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.1.5",
      "learning_indicator",
      "Round whole numbers up to 10,000 to the nearest thousands, hundreds and tens.",
      5,
      id("B4.1.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.1.6",
      "learning_indicator",
      "Skip count forwards and backwards in 50s and 100s up to and from 10,000.",
      6,
      id("B4.1.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.2",
      "content_standard",
      "Demonstrate understanding of Roman numerals up to XXX (30).",
      2,
      id("B4.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.2.1",
      "learning_indicator",
      "Develop an understanding of the Roman numeral system up to XXX (30).",
      1,
      id("B4.1.1.2"),
    ),

    node(
      subjectId,
      "B4.1.1.2.2",
      "learning_indicator",
      "Count and convert Hindu-Arabic numerals to Roman numerals up to 30 and vice versa.",
      2,
      id("B4.1.1.2"),
    ),

    node(
      subjectId,
      "B4.1.1.3",
      "content_standard",
      "Demonstrate an understanding of factors, multiples and squared numbers.",
      3,
      id("B4.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.3.1",
      "learning_indicator",
      "Determine the set of factors of given numbers up to 50.",
      1,
      id("B4.1.1.3"),
    ),

    node(
      subjectId,
      "B4.1.1.3.2",
      "learning_indicator",
      "Determine the highest common factor (HCF) of two whole numbers.",
      2,
      id("B4.1.1.3"),
    ),

    node(
      subjectId,
      "B4.1.1.3.3",
      "learning_indicator",
      "Determine the lowest common multiple (LCM) of at least two given numbers up to 100.",
      3,
      id("B4.1.1.3"),
    ),

    node(
      subjectId,
      "B4.1.1.3.4",
      "learning_indicator",
      "Recognise the relationship between factors and multiples.",
      4,
      id("B4.1.1.3"),
    ),

    node(
      subjectId,
      "B4.1.1.3.5",
      "learning_indicator",
      "Generate and analyse patterns in square numbers.",
      5,
      id("B4.1.1.3"),
    ),

    node(
      subjectId,
      "B4.1.1.3.6",
      "learning_indicator",
      "Represent square numbers using factors.",
      6,
      id("B4.1.1.3"),
    ),

    node(
      subjectId,
      "B4.1.1.4",
      "content_standard",
      "Interpret negative and positive numbers in context.",
      4,
      id("B4.1.1"),
    ),

    node(
      subjectId,
      "B4.1.1.4.1",
      "learning_indicator",
      "Describe real-life situations using positive and negative values.",
      1,
      id("B4.1.1.4"),
    ),

    node(
      subjectId,
      "B4.1.1.4.2",
      "learning_indicator",
      "Count forwards and backwards with positive and negative whole numbers through zero.",
      2,
      id("B4.1.1.4"),
    ),

    node(
      subjectId,
      "B4.1.2",
      "sub_strand",
      "Whole Numbers: Operations",
      2,
      id("B4.1"),
    ),

    node(
      subjectId,
      "B4.1.2.1",
      "content_standard",
      "Recall basic multiplication facts up to 12 × 12.",
      1,
      id("B4.1.2"),
    ),

    node(
      subjectId,
      "B4.1.2.1.1",
      "learning_indicator",
      "Determine basic multiplication facts up to 12 × 12.",
      1,
      id("B4.1.2.1"),
    ),

    node(
      subjectId,
      "B4.1.2.2",
      "content_standard",
      "Describe and apply mental mathematics strategies and number properties to determine answers for basic multiplication facts to 81 and related division facts.",
      2,
      id("B4.1.2"),
    ),

    node(
      subjectId,
      "B4.1.2.2.1",
      "learning_indicator",
      "Apply mental mathematics strategies and number properties to determine answers for basic multiplication facts to 81 and related division facts.",
      1,
      id("B4.1.2.2"),
    ),

    node(
      subjectId,
      "B4.1.2.2.2",
      "learning_indicator",
      "Apply mental mathematics strategies for multiplication, including annexing then adding zero, halving and doubling, and the distributive property.",
      2,
      id("B4.1.2.2"),
    ),

    node(
      subjectId,
      "B4.1.2.3",
      "content_standard",
      "Demonstrate an understanding of multiplication involving a 2- or 3-digit number by a 1-digit number.",
      3,
      id("B4.1.2"),
    ),

    node(
      subjectId,
      "B4.1.2.3.1",
      "learning_indicator",
      "Multiply multi-digit numbers efficiently.",
      1,
      id("B4.1.2.3"),
    ),

    node(
      subjectId,
      "B4.1.2.4",
      "content_standard",
      "Recall basic division facts up to 100.",
      4,
      id("B4.1.2"),
    ),

    node(
      subjectId,
      "B4.1.2.4.1",
      "learning_indicator",
      "Determine basic division facts up to 81.",
      1,
      id("B4.1.2.4"),
    ),

    node(
      subjectId,
      "B4.1.2.5",
      "content_standard",
      "Demonstrate an understanding of division involving a 2- or 3-digit number by a 1-digit number.",
      5,
      id("B4.1.2"),
    ),

    node(
      subjectId,
      "B4.1.2.5.1",
      "learning_indicator",
      "Divide 2-digit numbers by 1-digit numbers efficiently.",
      1,
      id("B4.1.2.5"),
    ),

    node(
      subjectId,
      "B4.1.2.6",
      "content_standard",
      "Translate and solve word problems involving the four basic operations on whole numbers.",
      6,
      id("B4.1.2"),
    ),

    node(
      subjectId,
      "B4.1.2.6.1",
      "learning_indicator",
      "Solve multi-step word problems involving the four basic operations.",
      1,
      id("B4.1.2.6"),
    ),

    node(
      subjectId,
      "B4.1.3",
      "sub_strand",
      "Fractions",
      3,
      id("B4.1"),
    ),

    node(
      subjectId,
      "B4.1.3.1",
      "content_standard",
      "Develop an understanding of equivalent and improper fractions.",
      1,
      id("B4.1.3"),
    ),

    node(
      subjectId,
      "B4.1.3.1.1",
      "learning_indicator",
      "Generate unit fractions and locate a unit fraction on a number line.",
      1,
      id("B4.1.3.1"),
    ),

    node(
      subjectId,
      "B4.1.3.1.2",
      "learning_indicator",
      "Recognise and name equivalent fractions using pictorial representations.",
      2,
      id("B4.1.3.1"),
    ),

    node(
      subjectId,
      "B4.1.3.1.3",
      "learning_indicator",
      "Find the simplest form of given fractions by dividing through by the highest common factor.",
      3,
      id("B4.1.3.1"),
    ),

    node(
      subjectId,
      "B4.1.3.1.4",
      "learning_indicator",
      "Recognise fractions greater than one and draw and label such fractions with their symbols.",
      4,
      id("B4.1.3.1"),
    ),

    node(
      subjectId,
      "B4.1.3.2",
      "content_standard",
      "Demonstrate an understanding of strategies for comparing, adding and subtracting fractions with the same denominator or where one denominator is a multiple of the other.",
      2,
      id("B4.1.3"),
    ),

    node(
      subjectId,
      "B4.1.3.2.1",
      "learning_indicator",
      "Compare and order fractions with like denominators using pictorial representations.",
      1,
      id("B4.1.3.2"),
    ),

    /*
     * B4.1.3.2.2 is not present in the source
     * extraction and is deliberately not fabricated.
     */

    node(
      subjectId,
      "B4.1.3.2.3",
      "learning_indicator",
      "Provide examples of where fractions are used.",
      3,
      id("B4.1.3.2"),
    ),

    node(
      subjectId,
      "B4.1.4",
      "sub_strand",
      "Decimals",
      4,
      id("B4.1"),
    ),

    node(
      subjectId,
      "B4.1.4.1",
      "content_standard",
      "Develop an understanding of decimals, tenths and hundredths, using concrete and pictorial representations and write decimal fractions as base-ten numbers with place value.",
      1,
      id("B4.1.4"),
    ),

    node(
      subjectId,
      "B4.1.4.1.1",
      "learning_indicator",
      "Describe and represent decimals, tenths and hundredths, concretely, pictorially and symbolically.",
      1,
      id("B4.1.4.1"),
    ),

    node(
      subjectId,
      "B4.1.4.1.2",
      "learning_indicator",
      "Round decimals to the nearest tenth.",
      2,
      id("B4.1.4.1"),
    ),

    node(
      subjectId,
      "B4.1.4.1.3",
      "learning_indicator",
      "Use models to explain the result of addition and subtraction of decimals up to hundredths.",
      3,
      id("B4.1.4.1"),
    ),

    node(
      subjectId,
      "B4.1.5",
      "sub_strand",
      "Percent",
      5,
      id("B4.1"),
    ),

    node(
      subjectId,
      "B4.1.5.1",
      "content_standard",
      "Demonstrate an understanding of percent, limited to whole numbers, concretely, pictorially and symbolically.",
      1,
      id("B4.1.5"),
    ),

    node(
      subjectId,
      "B4.1.5.1.1",
      "learning_indicator",
      "Model or recognise percent as a fraction related to hundredths using concrete models, pictorial representations and a number line.",
      1,
      id("B4.1.5.1"),
    ),

    node(
      subjectId,
      "B4.1.5.1.2",
      "learning_indicator",
      "Compare and order a mixture of common, decimal and percent fractions up to hundredths.",
      2,
      id("B4.1.5.1"),
    ),

    /*
     * ADDITIONAL ALGEBRA NODES
     *
     * Existing B4.2 / B4.2.1 nodes remain in index.ts.
     */

    node(
      subjectId,
      "B4.2.1.2",
      "content_standard",
      "Translate among different representations of a pattern, such as a table, a chart or concrete material.",
      2,
      "node-gh-b4-math-algebra-patterns-relationships",
    ),

    node(
      subjectId,
      "B4.2.1.2.1",
      "learning_indicator",
      "Create a concrete representation of a given pattern displayed in a table or chart.",
      1,
      id("B4.2.1.2"),
    ),

    node(
      subjectId,
      "B4.2.1.2.2",
      "learning_indicator",
      "Create a table or chart from a given concrete representation of a pattern.",
      2,
      id("B4.2.1.2"),
    ),

    node(
      subjectId,
      "B4.2.2",
      "sub_strand",
      "Functions and Unknowns",
      2,
      "node-gh-b4-math-algebra",
    ),

    node(
      subjectId,
      "B4.2.2.1",
      "content_standard",
      "Express a given problem as an equation in which a symbol is used to represent an unknown number.",
      1,
      id("B4.2.2"),
    ),

    node(
      subjectId,
      "B4.2.2.1.1",
      "learning_indicator",
      "Write a given problem as an equation in which a symbol is used to represent an unknown number.",
      1,
      id("B4.2.2.1"),
    ),

    node(
      subjectId,
      "B4.2.2.1.2",
      "learning_indicator",
      "Express a given pictorial or concrete representation of an equation in symbolic form.",
      2,
      id("B4.2.2.1"),
    ),

    node(
      subjectId,
      "B4.2.2.2",
      "content_standard",
      "Solve one-step equations involving a symbol to represent an unknown number.",
      2,
      id("B4.2.2"),
    ),

    node(
      subjectId,
      "B4.2.2.2.1",
      "learning_indicator",
      "Solve a given one-step equation using manipulatives.",
      1,
      id("B4.2.2.2"),
    ),

    node(
      subjectId,
      "B4.2.2.2.2",
      "learning_indicator",
      "Describe orally the meaning of a given one-step equation with one unknown.",
      2,
      id("B4.2.2.2"),
    ),

    node(
      subjectId,
      "B4.2.2.2.3",
      "learning_indicator",
      "Solve a given equation when the unknown is on the left or right side of the equation.",
      3,
      id("B4.2.2.2"),
    ),

    node(
      subjectId,
      "B4.2.2.2.4",
      "learning_indicator",
      "Solve a given one-step equation using guess and check.",
      4,
      id("B4.2.2.2"),
    ),

    node(
      subjectId,
      "B4.2.2.2.5",
      "learning_indicator",
      "Identify the unknown in a problem, represent the problem with an equation, and solve the problem concretely, pictorially or symbolically.",
      5,
      id("B4.2.2.2"),
    ),

    node(
      subjectId,
      "B4.2.2.2.6",
      "learning_indicator",
      "Represent and solve a given addition or subtraction problem involving a part-part-whole or comparison context, using a symbol to represent the unknown.",
      6,
      id("B4.2.2.2"),
    ),

    node(
      subjectId,
      "B4.2.2.2.7",
      "learning_indicator",
      "Create a problem for a given equation with one unknown.",
      7,
      id("B4.2.2.2"),
    ),

    /*
     * STRAND 3: GEOMETRY AND MEASUREMENT
     */

    node(
      subjectId,
      "B4.3",
      "strand",
      "Geometry and Measurement",
      3,
    ),

    node(
      subjectId,
      "B4.3.1",
      "sub_strand",
      "Lines and Shapes",
      1,
      id("B4.3"),
    ),

    node(
      subjectId,
      "B4.3.1.1",
      "content_standard",
      "Identify the lines of symmetry of regular and irregular 2D shapes.",
      1,
      id("B4.3.1"),
    ),

    node(
      subjectId,
      "B4.3.1.1.1",
      "learning_indicator",
      "Complete drawings of shapes to make them symmetrical.",
      1,
      id("B4.3.1.1"),
    ),

    node(
      subjectId,
      "B4.3.1.1.2",
      "learning_indicator",
      "Identify the lines of symmetry of regular and irregular 2D shapes, including triangles and quadrilaterals.",
      2,
      id("B4.3.1.1"),
    ),

    node(
      subjectId,
      "B4.3.2",
      "sub_strand",
      "Position and Movement",
      2,
      id("B4.3"),
    ),

    node(
      subjectId,
      "B4.3.2.1",
      "content_standard",
      "Describe the position of objects in space using the cardinal points.",
      1,
      id("B4.3.2"),
    ),

    node(
      subjectId,
      "B4.3.2.1.1",
      "learning_indicator",
      "Tell the position and motion of objects in space using the cardinal points.",
      1,
      id("B4.3.2.1"),
    ),

    node(
      subjectId,
      "B4.3.3",
      "sub_strand",
      "Measurement",
      3,
      id("B4.3"),
    ),

    node(
      subjectId,
      "B4.3.3.1",
      "content_standard",
      "Demonstrate understanding of perimeter of regular and irregular shapes.",
      1,
      id("B4.3.3"),
    ),

    node(
      subjectId,
      "B4.3.3.1.1",
      "learning_indicator",
      "Estimate perimeter using referents for centimetre or metre.",
      1,
      id("B4.3.3.1"),
    ),

    node(
      subjectId,
      "B4.3.3.1.2",
      "learning_indicator",
      "Measure and record perimeter for regular and irregular shapes in centimetres and metres.",
      2,
      id("B4.3.3.1"),
    ),

    node(
      subjectId,
      "B4.3.3.1.3",
      "learning_indicator",
      "Develop and apply a formula for determining the perimeter of a square and rectangle.",
      3,
      id("B4.3.3.1"),
    ),

    node(
      subjectId,
      "B4.3.3.1.4",
      "learning_indicator",
      "Construct different rectangles for a given perimeter to demonstrate that many shapes are possible for a perimeter.",
      4,
      id("B4.3.3.1"),
    ),

    node(
      subjectId,
      "B4.3.3.2",
      "content_standard",
      "Demonstrate an understanding of area of regular and irregular 2D shapes.",
      2,
      id("B4.3.3"),
    ),

    node(
      subjectId,
      "B4.3.3.2.1",
      "learning_indicator",
      "Recognise that area is measured in square units.",
      1,
      id("B4.3.3.2"),
    ),

    node(
      subjectId,
      "B4.3.3.2.2",
      "learning_indicator",
      "Select and justify referents for square centimetres or square metres.",
      2,
      id("B4.3.3.2"),
    ),

    node(
      subjectId,
      "B4.3.3.2.3",
      "learning_indicator",
      "Estimate area using referents for square centimetres or square metres.",
      3,
      id("B4.3.3.2"),
    ),

    node(
      subjectId,
      "B4.3.3.2.4",
      "learning_indicator",
      "Develop and apply a formula for determining the area of a rectangle and square.",
      4,
      id("B4.3.3.2"),
    ),

    node(
      subjectId,
      "B4.3.3.2.5",
      "learning_indicator",
      "Construct different rectangles for a given area to demonstrate that different rectangles may have the same area.",
      5,
      id("B4.3.3.2"),
    ),

    node(
      subjectId,
      "B4.3.3.3",
      "content_standard",
      "Demonstrate an understanding of time taken by events in minutes and hours.",
      3,
      id("B4.3.3"),
    ),

    node(
      subjectId,
      "B4.3.3.3.1",
      "learning_indicator",
      "Tell the time in hours and minutes on analogue and digital watches, including 24-hour clocks.",
      1,
      id("B4.3.3.3"),
    ),

    node(
      subjectId,
      "B4.3.3.3.2",
      "learning_indicator",
      "Use a clock to measure time to complete simple events in minutes and seconds.",
      2,
      id("B4.3.3.3"),
    ),

    node(
      subjectId,
      "B4.3.3.3.3",
      "learning_indicator",
      "State dates of events and record calendar dates in a variety of formats.",
      3,
      id("B4.3.3.3"),
    ),

    /*
     * STRAND 4: DATA
     */

    node(
      subjectId,
      "B4.4",
      "strand",
      "Data",
      4,
    ),

    node(
      subjectId,
      "B4.4.1",
      "sub_strand",
      "Data",
      1,
      id("B4.4"),
    ),

    node(
      subjectId,
      "B4.4.1.1",
      "content_standard",
      "Demonstrate an understanding of many-to-one correspondence in displaying, reading and interpreting graphs.",
      1,
      id("B4.4.1"),
    ),

    node(
      subjectId,
      "B4.4.1.1.1",
      "learning_indicator",
      "Use an understanding of one-to-one correspondence to read and interpret graphs.",
      1,
      id("B4.4.1.1"),
    ),

    node(
      subjectId,
      "B4.4.1.1.2",
      "learning_indicator",
      "Use an understanding of many-to-one correspondence to display or construct graphs.",
      2,
      id("B4.4.1.1"),
    ),

    node(
      subjectId,
      "B4.4.1.1.3",
      "learning_indicator",
      "Compare graphs in which the same data has been displayed and explain how they are the same and different.",
      3,
      id("B4.4.1.1"),
    ),

    node(
      subjectId,
      "B4.4.1.1.4",
      "learning_indicator",
      "Find examples of graphs in which many-to-one correspondence is used in print and electronic media and describe the correspondence used.",
      4,
      id("B4.4.1.1"),
    ),

    /*
     * The extraction contains code B4.4.1.2 but its
     * official content-standard statement was not recovered.
     * FILUMIRE records the node without inventing the wording.
     */

    node(
      subjectId,
      "B4.4.1.2",
      "content_standard",
      "Construct and interpret pictographs and bar graphs involving many-to-one correspondence to draw conclusions.",
      2,
      id("B4.4.1"),
    ),

    node(
      subjectId,
      "B4.4.1.2.1",
      "learning_indicator",
      "Identify common features of graphs that use many-to-one correspondence and use that understanding to draw bar graphs or pictographs, complete with title, labelled axes, key or legend, to represent data collected.",
      1,
      id("B4.4.1.2"),
    ),

    node(
      subjectId,
      "B4.4.1.2.2",
      "learning_indicator",
      "Use understanding of many-to-one correspondence to solve simple problems requiring interpretation of many-to-one bar graphs.",
      2,
      id("B4.4.1.2"),
    ),
  ];
}

