# preprocessor script for CSV file

import pandas as pd
import numpy as np
import json
import os
import glob
from matplotlib import pyplot
from datetime import datetime
from PIL import Image

### GLOBALS ###

srcPath = './machinelearning/training/src'
imgPath = './machinelearning/training/images'
preprocessedPath = './machinelearning/training/preprocessed'

dropFeatures = ['VesselName', 'IMO', 'CallSign', 'VesselType', 'Status', 'Length', 'Width', 'Draft', 'Cargo', 'TranscieverClass'] # List of columns to drop from original csv
pad = False # Determines if the paths will be padded
getCSVStats = False # If set to true will provide info about the CSV contents
minLen = 40
maxLen = 50
outPathsCount = 20

### FUNCTIONS ###

# Function to clear any old json files from the output folder
def clearJsons():
  '''Deletes all JSON files in ./training/ folder'''

  print('Clearning JSON files in training file.')
  removed = 0
  for file in glob.glob('%s/*.json' % preprocessedPath):
    os.remove(file) 
    removed = removed + 1
  print('Removed: %d files.' % removed)

# Function to process paths into json format
def processPaths(dfPaths, minLen, maxLen, outPathsCount, pad):
  """
  Processes paths into JSON format.

  Parameters
  ----------
    dfPaths : List
      list of paths, separated by MMSI
    minLen : int
      Minimum path length to accept, and pad
    maxLen : int
      Maximum path length to accept, pad shorter path lengths to this length
    outPathsCount : int
      The number of paths to output as JSON files. If not enough fitting paths exist, all available paths will be taken.
    pad :
      boolean value to control if padding is done.
  """
  # Create list of viable paths (should probably go with getPaths since process paths logically should take in paths to process)
  viablePaths = getPaths(dfPaths, minLen, maxLen)
  viablePaths = viablePaths[0:min(len(viablePaths), outPathsCount)]
  
  # Process all selected paths
  for pathNum, path in enumerate(viablePaths):
    if(pathFilter(path)):
      path.reset_index(drop=True, inplace=True)
      MMSI = str(path['MMSI'][0])
      path.drop(labels=['MMSI'], inplace=True, axis=1)
      # Convert times to unix time
      path['BaseDateTime'] = path['BaseDateTime'].apply(timeToInt)
      # Sort by time in acending order
      path = path.sort_values(by=['BaseDateTime'])
      # BaseDateTime needs to either be normalized correctly from 0 to 255, or dropped after sorting
      # Normalize values from 0 to 255
      path['LAT'] = path['LAT'].apply(normalizeVal, args=(-90, 90, 0, 255))
      path['LON'] = path['LON'].apply(normalizeVal, args=(-180, 280, 0, 255))
      path['SOG'] = path['SOG'].apply(normalizeVal, args=(0, 100, 0, 255))
      path['COG'] = path['COG']%360
      path['COG'] = path['COG'].apply(normalizeVal, args=(0, 364, 0, 255))
      path['Heading'] = path['Heading'].apply(normalizeVal, args=(0, 364, 0, 255))
      if(pad):
        # Add padding
        path, percentPadded = addPadding(maxLen, path)
      else:
        # skip padding
        percentPadded = "0%"

      pathStr = path.to_json(orient = 'values', indent = 4)

      savePath({ 'MMSI' : MMSI, 'Percent Padded' : percentPadded, 'PathData' : json.loads(pathStr)})

# Group by mmsi in list of dataframes
def getPaths(paths, minLen, maxLen):
  """
  Returns a list of paths within the specified range.
  
  Parameters
  ----------
  paths : Dataframe
    A dataframe of all the available path data.
  minLen : int
    The shortest acceptable path length to include.
  maxLen : int
    The longest acceptable path length to include.

  Outputs
  -------
  viablePaths : list
    List of paths in the specified range.
  """
  viablePaths = list(filter(lambda trip: len(trip) >= minLen and len(trip) <= maxLen, paths))
  return viablePaths

def pathFilter(path):
  # Checks if the path has the heading value 511.0
  goodPath = False
  missingHeading = float(511.0) in path['Heading'].values
  if(missingHeading):
      print('Ignore, heading missing.')
  else:
    # Check for stationary paths
    sogMean = path['SOG'].mean()
    if(sogMean < 1):
      print('Ignore, stationary path. Mean SOG: %.3f' % sogMean)
    else:
      goodPath = True
  
  return goodPath

#Takes a string representing a datetime value and returns an float
def timeToInt(orgDateTime):
  '''Function to convert a string date time value to a unix time float.'''
  
  #Takes a string and its format and creates a datetime object
  dtObject = datetime.strptime(orgDateTime,'%Y-%m-%dT%H:%M:%S')
  #Takes the date time object and returns it as unix time
  unixTime = dtObject.timestamp()
  return unixTime

# Normalizes a value from normLow to normHigh
def normalizeVal(value, startRangeLow, startRangeHigh, endRangeLow, endRangeHigh):
  """
  Function to normalize numeric values to a given range.
  ----------
  value : 
    The value to normalize.
  startRangeLow :
    The min normalization is based off of.
  startRangeHigh :
    The max normalization is based off of.
  endRangeLow :
    The lowest value in the normalization range.
  endRangeHigh :
    The highest value in the normalization range.

  Outputs
  -------
    (normHigh - normLow) / (end - start) * (value-start) + normLow
  """
  return (endRangeHigh - endRangeLow) / (startRangeHigh - startRangeLow) * (value-startRangeLow) + endRangeLow

# Pad a path dataframe to a specific length with zeros (currently unused)
def addPadding(padLength, path):
  """Add padding to a path
  
  Parameters
  ----------
  padLength : int
    The total length each path should be padded to.
  path : list
    a path as a list
  
  Outputs
  -------
  newDF : Dataframe
    Dataframe of paths padded with repitition of the last node.
  """
  dfDict = {}
  for series in path:
    seriesLen = len(path[series])
    paddedCount = padLength - seriesLen
    padding = pd.Series(data = [path[series][seriesLen - 1]] * (paddedCount))
    dfDict[series] = (path[series].append(padding, ignore_index = True))
  print(dfDict)

  newDF = pd.DataFrame(dfDict)
  percentPadded = '%d%%' % ((100/len(newDF))*paddedCount)

  return newDF, percentPadded

def savePath(pathObj):
  '''Takes JSON object and saves it to the filesystem.'''
  #Get a list of the files in the directory
  files = os.listdir(preprocessedPath)
  #Create a variable to count the saved jsons
  savecount = 0
  #Count the number of saved jsons
  while(files.__contains__('path%d.json' % (savecount)) or savecount == 0):
    savecount = savecount + 1
    #Save the path with a unique name
    with open('%s/path%d.json' % (preprocessedPath, savecount), 'w') as file:
      json.dump(pathObj, file, indent=4)

def run():
  #Load defaults
  with open('./machinelearning/preprocessor.json', 'r') as f:
    data = json.load(f)
  srcPath = data['srcPath']
  preprocessedPath = data['preprocessedPath']
  dropFeatures = data['dropFeatures']
  pad = data['pad']
  getCSVStats = data['getCSVStats']
  minLen = data['minLen']
  maxLen = data['maxLen']
  outPathsCount = data['outPathsCount']

  clearJsons()
  # Read in csv's
  for file in glob.glob('%s/*.csv' % srcPath):
    print('Opening CSV %s' % file)
    df = pd.read_csv(file)
    print('CSV loaded')

    # Drop unneeded columns
    df.drop(labels=dropFeatures, axis=1, inplace=True)
    groupedByMMSI = [x[1] for x in df.groupby('MMSI', sort=False)]

    if(getCSVStats):
      print('Paths Count: %d' % len(groupedByMMSI))
      groupsLens = []
      for x in groupedByMMSI:
        groupsLens.append(len(x))
    
      unique, frequency = np.unique(groupsLens, return_counts=True)
      arr = np.asarray((unique, frequency))
      print(max(arr[1]))
      pyplot.bar(unique, frequency)
      pyplot.show()

    processPaths(groupedByMMSI, minLen, maxLen, outPathsCount, pad)