import React from "react";
import { colors } from "@/lib/design-system/colors";
import { typography } from "@/lib/design-system/typography";

interface TableColumn {
  header: string;
  key: string;
  align?: "left" | "center" | "right";
  width?: string;
}

interface TableProps {
  columns: TableColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderCell?: (
    column: TableColumn,
    row: any,
    rowIndex: number,
  ) => React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Table({
  columns,
  data,
  renderCell,
  className = "",
  hoverable = true,
}: TableProps) {
  const tableStyles: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: typography.fontFamily,
  };

  const headerStyles: React.CSSProperties = {
    backgroundColor: colors.oxfordNavy,
    color: typography.tableHeader.color,
    fontSize: typography.tableHeader.fontSize,
    fontWeight: typography.tableHeader.fontWeight,
    textAlign: "left",
    padding: "16px",
  };

  const cellStyles: React.CSSProperties = {
    padding: "16px",
    fontSize: typography.tableCell.fontSize,
    fontWeight: typography.tableCell.fontWeight,
    color: typography.tableCell.color,
    borderBottom: `1px solid ${colors.backgroundLight}`,
  };

  const rowStyles: React.CSSProperties = {
    backgroundColor: colors.white,
    transition: hoverable ? "background-color 0.2s ease" : "none",
  };

  return (
    <div style={{ overflowX: "auto" }} className={className}>
      <table style={tableStyles}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                style={{
                  ...headerStyles,
                  textAlign: column.align || "left",
                  width: column.width,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={rowStyles}
              onMouseEnter={(e) =>
                hoverable &&
                (e.currentTarget.style.backgroundColor = colors.backgroundLight)
              }
              onMouseLeave={(e) =>
                hoverable &&
                (e.currentTarget.style.backgroundColor = colors.white)
              }
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  style={{
                    ...cellStyles,
                    textAlign: column.align || "left",
                  }}
                >
                  {renderCell
                    ? renderCell(column, row, rowIndex)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
