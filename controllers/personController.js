const Person = require('../models/person');

// Create a new person
// exports.createPerson = async (req, res) => {
//   try {
//     const {
//       name,
//       gender,
//       dateOfBirth,
//       placeOfBirth,
//       currentAddress,
//       contactNumber,
//       countryCode,
//       email,
//       occupation,
//       photo,
//       parent_ids,
//       spouse_id = null
//     } = req.body;

//     const personData = {
//       name,
//       gender,
//       dateOfBirth,
//       placeOfBirth,
//       currentAddress,
//       contactNumber,
//       countryCode: countryCode || '+91',
//       occupation,
//       photo,
//       parent_ids: parent_ids || [],
//       children_ids: [],
//       familyId: req.user.familyId // Add family ID from authenticated user
//     };

//     if (email && email.trim() !== '') {
//       personData.email = email.trim();
//     }
    
//     if (spouse_id && spouse_id.trim() !== '') {
//       personData.spouse_id = spouse_id.trim();
//     }

//     const person = new Person(personData);
//     const savedPerson = await person.save();

//     if (personData.spouse_id) {
//       await Person.findOneAndUpdate(
//         { _id: personData.spouse_id, familyId: req.user.familyId },
//         { spouse_id: savedPerson._id }
//       );

//       // --- NEW LOGIC: Merge children between spouses for consistency ---
//       const spouse = await Person.findOne({ _id: personData.spouse_id, familyId: req.user.familyId });
//       const spouseChildrenIds = (spouse && spouse.children_ids) ? spouse.children_ids.map(id => id.toString()) : [];
//       const personChildrenIds = (savedPerson.children_ids || []).map(id => id.toString());

//       // Children present in spouse but not in person
//       const spouseOnlyChildren = spouseChildrenIds.filter(id => !personChildrenIds.includes(id));
//       // Children present in person but not in spouse
//       const personOnlyChildren = personChildrenIds.filter(id => !spouseChildrenIds.includes(id));

//       // For each spouse-only child, add to person's children_ids and add person as parent
//       if (spouseOnlyChildren.length > 0) {
//         await Person.findOneAndUpdate(
//           { _id: savedPerson._id, familyId: req.user.familyId },
//           { $addToSet: { children_ids: { $each: spouseOnlyChildren } } }
//         );
//         await Person.updateMany(
//           { _id: { $in: spouseOnlyChildren }, familyId: req.user.familyId },
//           { $addToSet: { parent_ids: savedPerson._id } }
//         );
//       }
//       // For each person-only child, add to spouse's children_ids and add spouse as parent
//       if (personOnlyChildren.length > 0) {
//         await Person.findOneAndUpdate(
//           { _id: spouse._id, familyId: req.user.familyId },
//           { $addToSet: { children_ids: { $each: personOnlyChildren } } }
//         );
//         await Person.updateMany(
//           { _id: { $in: personOnlyChildren }, familyId: req.user.familyId },
//           { $addToSet: { parent_ids: spouse._id } }
//         );
//       }
//     }

//     if (parent_ids.length > 0) {
//       await Person.updateMany(
//         { _id: { $in: parent_ids }, familyId: req.user.familyId },
//         { $push: { children_ids: savedPerson._id } }
//       );
//     }

//     res.status(201).json({
//       success: true,
//       data: savedPerson
//     });
//   } catch (error) {
//     console.error('Error creating person:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Error creating person'
//     });
//   }
// };
const mongoose = require('mongoose');

exports.createPerson = async (req, res) => {
  try {
    // console.log('form data sent to backend:', req.body);

    const {
      name,
      gender,
      dateOfBirth,
      placeOfBirth,
      currentAddress,
      contactNumber,
      countryCode,
      email,
      occupation,
      photo,
      parent_ids = [],
      spouse_id = null
    } = req.body;

    // Convert IDs to ObjectId to avoid type mismatch issues
    const parentObjectIds = parent_ids.map(id => new mongoose.Types.ObjectId(id));
    const spouseObjectId = spouse_id ? new mongoose.Types.ObjectId(spouse_id) : null;

    const personData = {
      name,
      gender,
      dateOfBirth,
      placeOfBirth,
      currentAddress,
      contactNumber,
      countryCode: countryCode || '+91',
      occupation,
      photo,
      parent_ids: parentObjectIds,
      children_ids: [],
      familyId: req.user.familyId
    };

    if (email && email.trim() !== '') {
      personData.email = email.trim();
    }
    if (spouseObjectId) {
      personData.spouse_id = spouseObjectId;
    }

    // Save new person
    const savedPerson = await new Person(personData).save();

    // Update parents → add new child
    if (parentObjectIds.length > 0) {
      const parentUpdate = await Person.updateMany(
        { _id: { $in: parentObjectIds }, familyId: req.user.familyId },
        { $addToSet: { children_ids: savedPerson._id } }
      );
      // console.log(`Updated ${parentUpdate.modifiedCount} parents with child ID.`);

      // Update child → add parents
      const childUpdate = await Person.updateOne(
        { _id: savedPerson._id },
        { $addToSet: { parent_ids: { $each: parentObjectIds } } }
      );
      // console.log(`Updated ${childUpdate.modifiedCount} child with parent IDs.`);
    }

    // Update spouse relationship
    if (spouseObjectId) {
      await Person.findOneAndUpdate(
        { _id: spouseObjectId, familyId: req.user.familyId },
        { spouse_id: savedPerson._id }
      );

      // Merge children between spouses
      const spouse = await Person.findOne({ _id: spouseObjectId, familyId: req.user.familyId });
      const spouseChildrenIds = (spouse?.children_ids || []).map(id => id.toString());
      const personChildrenIds = (savedPerson.children_ids || []).map(id => id.toString());

      const spouseOnlyChildren = spouseChildrenIds.filter(id => !personChildrenIds.includes(id));
      const personOnlyChildren = personChildrenIds.filter(id => !spouseChildrenIds.includes(id));

      if (spouseOnlyChildren.length > 0) {
        await Person.findByIdAndUpdate(
          savedPerson._id,
          { $addToSet: { children_ids: { $each: spouseOnlyChildren } } }
        );
        await Person.updateMany(
          { _id: { $in: spouseOnlyChildren }, familyId: req.user.familyId },
          { $addToSet: { parent_ids: savedPerson._id } }
        );
      }
      if (personOnlyChildren.length > 0) {
        await Person.findByIdAndUpdate(
          spouse._id,
          { $addToSet: { children_ids: { $each: personOnlyChildren } } }
        );
        await Person.updateMany(
          { _id: { $in: personOnlyChildren }, familyId: req.user.familyId },
          { $addToSet: { parent_ids: spouse._id } }
        );
      }
    }

    res.status(201).json({
      success: true,
      data: savedPerson
    });

  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating person'
    });
  }
};

// Get all persons
exports.getAllPersons = async (req, res) => {
  try {
    const persons = await Person.find({ familyId: req.user.familyId })
      .populate('parent_ids', 'name gender dateOfBirth')
      .populate('spouse_id', 'name gender dateOfBirth')
      .populate('children_ids', 'name gender dateOfBirth');

    res.status(200).json({
      success: true,
      data: persons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching persons'
    });
  }
};

// Get a single person
exports.getPerson = async (req, res) => {
  try {
    const person = await Person.findOne({ 
      _id: req.params.id, 
      familyId: req.user.familyId 
    })
      .populate('parent_ids', 'name gender dateOfBirth')
      .populate('spouse_id', 'name gender dateOfBirth')
      .populate('children_ids', 'name gender dateOfBirth');

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Person not found'
      });
    }

    res.status(200).json({
      success: true,
      data: person
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching person'
    });
  }
};

// Get unique occupations for search suggestions
exports.getOccupations = async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = { familyId: req.user.familyId };
    if (search && search.trim() !== '') {
      query.occupation = { 
        $regex: search.trim(), 
        $options: 'i',
        $ne: null,
        $ne: ''
      };
    } else {
      query.occupation = { $ne: null, $ne: '', $exists: true };
    }

    const occupations = await Person.distinct('occupation', query);
    
    // Filter out empty strings and sort
    const filteredOccupations = occupations
      .filter(occ => occ && occ.trim() !== '')
      .sort()
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: filteredOccupations
    });
  } catch (error) {
    console.error('Error fetching occupations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching occupations'
    });
  }
};

// Get eligible spouses for edit feature
exports.getEligibleSpousesEdit = async (req, res) => {
  try {
    const { currentPersonId, currentPersonGender } = req.query;

    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    let genderQuery = {};
    if (currentPersonGender === 'Male') {
      genderQuery = { gender: 'Female' };
    } else if (currentPersonGender === 'Female') {
      genderQuery = { gender: 'Male' };
    }

    const eligible = await Person.find({
      _id: { $ne: currentPersonId },
      familyId: req.user.familyId,
      dateOfBirth: { $lte: eighteenYearsAgo },
      ...genderQuery
    }).select('name');

    res.status(200).json({
      success: true,
      data: eligible
    });
  } catch (error) {
    console.error('Error fetching eligible spouses (edited):', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching eligible spouses'
    });
  }
};

// Get eligible spouses for new member
exports.getEligibleSpousesNewMember = async (req, res) => {
  try {
    const { currentPersonId, currentPersonGender } = req.query;

    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    let genderQuery = {};
    if (currentPersonGender === 'Male') {
      genderQuery = { gender: 'Female' };
    } else if (currentPersonGender === 'Female') {
      genderQuery = { gender: 'Male' };
    } // Otherwise match all genders

    const eligible = await Person.find({
      _id: { $ne: currentPersonId },
      familyId: req.user.familyId,
      dateOfBirth: { $lte: eighteenYearsAgo },
      ...genderQuery,
      $or: [
        { spouse_id: null },
        { spouse_id: { $exists: false } }
      ]
    }).select('name');

    res.status(200).json({
      success: true,
      data: eligible
    });
  } catch (error) {
    console.error('Error fetching eligible spouses:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching eligible spouses'
    });
  }
};

// Get eligible parents
exports.getEligibleParents = async (req, res) => {
  try {
    // Calculate the date 20 years ago from today
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);

    // Query to get:
    const people = await Person.find({
      familyId: req.user.familyId,
      $or: [
        // Married people
        { spouse_id: { $exists: true, $ne: null } },
    
        // Single and at least 20 years old
        {
          $and: [
            { $or: [ { spouse_id: null }, { spouse_id: { $exists: false } } ] },
            { dateOfBirth: { $lte: twentyYearsAgo } }
          ]
        }
      ]
    }).select('name gender dateOfBirth spouse_id');

    // Populate spouse data for those with spouse_id
    const populated = await Person.populate(people, {
      path: 'spouse_id',
      select: 'name gender dateOfBirth'
    });

    // Process to avoid duplicate couples for those with spouses
    const uniqueCouples = [];
    const seen = new Set();

    populated.forEach(person => {
      // Handle people with spouses
      if (person.spouse_id) {
        const ids = [person._id.toString(), person.spouse_id._id.toString()].sort();
        const key = ids.join('-');

        if (!seen.has(key)) {
          seen.add(key);
          uniqueCouples.push(person);
        }
      } else {
        // Include people without spouses (already filtered to be >20 years old)
        uniqueCouples.push(person);
      }
    });

    res.status(200).json({
      success: true,
      data: uniqueCouples
    });
  } catch (error) {
    console.error('Error fetching people with spouses or over 20:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching people with spouses or over 20'
    });
  }
};

// Get family tree (only trees containing the current user, identified by email)
exports.getFamilyTree = async (req, res) => {
  try {
    const depth = parseInt(req.query.depth) || 3;
    const currentUserEmail = req.user.email; // Using email instead of _id

    if (!currentUserEmail) {
      return res.status(400).json({
        success: false,
        message: 'User email not available'
      });
    }

    // First, find the current user's person record by email
    const currentUserPerson = await Person.findOne({
      email: currentUserEmail,
      familyId: req.user.familyId
    }).lean();

    if (!currentUserPerson) {
      return res.status(404).json({
        success: false,
        message: 'Person record not found for current user'
      });
    }

    // Find all ancestors of the current user up to the requested depth
    async function findAncestors(personId, maxDepth) {
      const ancestors = new Set();
      const queue = [{ id: personId, depth: 0 }];
      
      while (queue.length > 0) {
        const { id, depth } = queue.shift();
        if (depth > maxDepth) continue;
        
        const person = await Person.findOne({ 
          _id: id,
          familyId: req.user.familyId
        }).lean();
        
        if (!person) continue;
        
        ancestors.add(person._id.toString());
        
        if (person.spouse_id) {
          ancestors.add(person.spouse_id.toString());
        }
        
        if (depth < maxDepth) {
          // Add parents to queue
          const parents = await Person.find({
            _id: { $in: person.parent_ids },
            familyId: req.user.familyId
          }).lean();
          
          parents.forEach(parent => {
            queue.push({ id: parent._id, depth: depth + 1 });
          });
        }
      }
      
      return ancestors;
    }

    // const userAncestors = await findAncestors(currentUserPerson._id, depth);
    const currentUserId = currentUserPerson._id.toString();


    // Get all potential root persons (no parents) from the user's family
    const potentialRootPersons = await Person.find({ 
      parent_ids: { $size: 0 },
      familyId: req.user.familyId
    })
      .sort({ dateOfBirth: 1 }) // oldest first
      .lean();

    if (potentialRootPersons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No persons with no parents found'
      });
    }

    const usedRoots = new Set();
    const trees = [];

    async function dfs(personId, currentDepth, visited) {
      if (currentDepth > depth) return null;
      if (!personId) return null;

      const idStr = personId.toString();
      if (visited.has(idStr)) {
        return null;
      }

      const person = await Person.findOne({ 
        _id: personId,
        familyId: req.user.familyId
      })
        .populate({
          path: 'spouse_id',
          select: '_id name gender dateOfBirth photo occupation currentAddress contactNumber email countryCode'
        })
        .populate('children_ids', '_id name gender dateOfBirth photo occupation currentAddress contactNumber email countryCode')
        .lean();

      if (!person) return null;

      const node = {
        _id: person._id,
        name: person.name,
        gender: person.gender,
        dateOfBirth: person.dateOfBirth,
        photo: person.photo || null,
        occupation: person.occupation || null,
        currentAddress: person.currentAddress || null,
        countryCode: person.countryCode || "+91",
        contactNumber: person.contactNumber || null,
        email: person.email || null,
        spouse_id: person.spouse_id ? person.spouse_id._id : null,
        spouse: person.spouse_id
          ? {
              _id: person.spouse_id._id,
              name: person.spouse_id.name,
              gender: person.spouse_id.gender,
              dateOfBirth: person.spouse_id.dateOfBirth,
              photo: person.spouse_id.photo || null,
              occupation: person.spouse_id.occupation || null,
              currentAddress: person.spouse_id.currentAddress || null,
              countryCode: person.spouse_id.countryCode || "+91",
              contactNumber: person.spouse_id.contactNumber || null,
              email: person.spouse_id.email || null
            }
          : null,
        children: []
      };

      visited.set(idStr, node);

      node.children = (
        await Promise.all(
          (person.children_ids || []).map(c => dfs(c._id, currentDepth + 1, visited))
        )
      ).filter(c => c !== null);

      return node;
    }

    // Iterate through potential roots, building trees only for unused root nodes
    for (const root of potentialRootPersons) {
      const idStr = root._id.toString();
      if (!usedRoots.has(idStr)) {
        const visited = new Map();
        const tree = await dfs(root._id, 0, visited);
        
        if (tree) {
          // Check if this tree contains the current user or any of their ancestors
          let containsUser = false;
          const queue = [tree];
          
          while (queue.length > 0 && !containsUser) {
            const node = queue.shift();
            // if (userAncestors.has(node._id.toString())) {
            //   containsUser = true;
            //   break;
            // }
            // if (node.spouse && userAncestors.has(node.spouse._id.toString())) {
            //   containsUser = true;
            //   break;
            // }
            if (node._id.toString() === currentUserId) {
              containsUser = true;
              break;
            }
            if (node.spouse && node.spouse._id.toString() === currentUserId) {
              containsUser = true;
              break;
            }
            
            if (node.children) {
              queue.push(...node.children);
            }
          }
          
          if (containsUser) {
            trees.push(tree);
            usedRoots.add(idStr);
            if (tree.spouse_id) {
              usedRoots.add(tree.spouse_id.toString());
            }
            const markQueue = [tree];
            while (markQueue.length > 0) {
              const node = markQueue.shift();
              usedRoots.add(node._id.toString());
              if (node.spouse) {
                usedRoots.add(node.spouse._id.toString());
              }
              if (node.children) {
                markQueue.push(...node.children);
              }
            }
          }
        }
      }
    }

    if (trees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No family trees found containing the current user'
      });
    }

    res.status(200).json({
      success: true,
      data: trees
    });

  } catch (error) {
    console.error('Error building family tree:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error building family tree'
    });
  }
};

// Update a person by ID
exports.updatePerson = async (req, res) => {
  try {
    const personId = req.params.id;
    const updateData = req.body;

    // Remove fields that should not be updated directly
    delete updateData._id;

    // Fetch the current person from user's family
    const currentPerson = await Person.findOne({ 
      _id: personId,
      familyId: req.user.familyId
    });
    if (!currentPerson) {
      return res.status(404).json({
        success: false,
        message: 'Person not found',
      });
    }

    // Sync name/email changes with User collection 
    const User = require('../models/User'); // Make sure path is correct
    let shouldUpdateUser = false;
    const userUpdateFields = {};

    // Handle email change
    if (updateData.email && updateData.email.trim().toLowerCase() !== currentPerson.email) {
      const newEmail = updateData.email.trim().toLowerCase();

      // Check if another user already has this email
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser && existingUser.familyId.toString() !== req.user.familyId.toString()) {
        return res.status(400).json({ success: false, message: 'Email already in use.' });
      }
      userUpdateFields.email = newEmail;
      updateData.email = newEmail;
      shouldUpdateUser = true;
    }

    // Handle name change
    if (updateData.name && updateData.name !== currentPerson.name) {
      userUpdateFields.name = updateData.name;
      shouldUpdateUser = true;
    }

    // If this person is linked to a user, update them too
    if (shouldUpdateUser) {
      await User.updateOne(
        { email: currentPerson.email, familyId: req.user.familyId },
        { $set: userUpdateFields }
      );
    }

    // --- Handle parent_ids ---
    if ('parent_ids' in updateData) {
      // Remove this person from old parents' children_ids
      if (currentPerson.parent_ids && currentPerson.parent_ids.length > 0) {
        await Person.updateMany(
          { _id: { $in: currentPerson.parent_ids }, familyId: req.user.familyId },
          { $pull: { children_ids: personId } }
        );
      }
      
      // Add this person to new parents' children_ids
      if (updateData.parent_ids && Array.isArray(updateData.parent_ids) && updateData.parent_ids.length > 0) {
        // Filter out any null or undefined values
        const validParentIds = updateData.parent_ids.filter(id => id);
        if (validParentIds.length > 0) {
          await Person.updateMany(
            { _id: { $in: validParentIds }, familyId: req.user.familyId },
            { $addToSet: { children_ids: personId } }
          );
        }
        updateData.parent_ids = validParentIds;
      } else {
        updateData.parent_ids = [];
      }
    }

    // --- Handle spouse_id ---
    if ('spouse_id' in updateData) {
      const newSpouseId = updateData.spouse_id;
      const oldSpouseId = currentPerson.spouse_id;

      const childrenIds = currentPerson.children_ids || [];

      // If spouse is being removed (set to null or empty string)
      if (!newSpouseId || newSpouseId === '') {
        if (oldSpouseId) {
          // Remove bidirectional spouse reference
          await Person.findOneAndUpdate(
            { _id: oldSpouseId, familyId: req.user.familyId },
            { spouse_id: null }
          );

          // Remove old spouse from each child's parent_ids
          await Person.updateMany(
            { _id: { $in: childrenIds }, familyId: req.user.familyId },
            { $pull: { parent_ids: oldSpouseId } }
          );

          // Remove children from old spouse's children_ids
          await Person.findOneAndUpdate(
            { _id: oldSpouseId, familyId: req.user.familyId },
            { $pull: { children_ids: { $in: childrenIds } } }
          );
        }
        updateData.spouse_id = null;
      }

      // If spouse is being changed
      else if (String(newSpouseId) !== String(oldSpouseId)) {
        if (oldSpouseId) {
          await Person.findOneAndUpdate(
            { _id: oldSpouseId, familyId: req.user.familyId },
            { spouse_id: null }
          );

          // Clean up old spouse relationship with children
          await Person.updateMany(
            { _id: { $in: childrenIds }, familyId: req.user.familyId },
            { $pull: { parent_ids: oldSpouseId } }
          );
          await Person.findOneAndUpdate(
            { _id: oldSpouseId, familyId: req.user.familyId },
            { $pull: { children_ids: { $in: childrenIds } } }
          );
        }

        // Add bidirectional spouse reference
        await Person.findOneAndUpdate(
          { _id: newSpouseId, familyId: req.user.familyId },
          { spouse_id: personId }
        );

        // Add new spouse as parent of the person's children
        if (childrenIds.length > 0) {
          await Person.updateMany(
            { _id: { $in: childrenIds }, familyId: req.user.familyId },
            { $addToSet: { parent_ids: newSpouseId } }
          );

          // Add children to new spouse
          await Person.findOneAndUpdate(
            { _id: newSpouseId, familyId: req.user.familyId },
            { $addToSet: { children_ids: { $each: childrenIds } } }
          );
        }

        // Merge children between spouses for consistency
        // Fetch new spouse's children
        const newSpouse = await Person.findOne({ _id: newSpouseId, familyId: req.user.familyId });
        const spouseChildrenIds = (newSpouse && newSpouse.children_ids) ? newSpouse.children_ids.map(id => id.toString()) : [];
        const personChildrenIds = childrenIds.map(id => id.toString());

        // Children present in spouse but not in person
        const spouseOnlyChildren = spouseChildrenIds.filter(id => !personChildrenIds.includes(id));
        // Children present in person but not in spouse
        const personOnlyChildren = personChildrenIds.filter(id => !spouseChildrenIds.includes(id));

        // For each spouse-only child, add to person's children_ids and add person as parent
        if (spouseOnlyChildren.length > 0) {
          await Person.findOneAndUpdate(
            { _id: personId, familyId: req.user.familyId },
            { $addToSet: { children_ids: { $each: spouseOnlyChildren } } }
          );
          await Person.updateMany(
            { _id: { $in: spouseOnlyChildren }, familyId: req.user.familyId },
            { $addToSet: { parent_ids: personId } }
          );
        }
        // For each person-only child, add to spouse's children_ids and add spouse as parent
        if (personOnlyChildren.length > 0) {
          await Person.findOneAndUpdate(
            { _id: newSpouseId, familyId: req.user.familyId },
            { $addToSet: { children_ids: { $each: personOnlyChildren } } }
          );
          await Person.updateMany(
            { _id: { $in: personOnlyChildren }, familyId: req.user.familyId },
            { $addToSet: { parent_ids: newSpouseId } }
          );
        }
      }
    }


    // Update the person (ensure it belongs to user's family)
    const updatedPerson = await Person.findOneAndUpdate(
      { _id: personId, familyId: req.user.familyId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('parent_ids', 'name gender dateOfBirth')
      .populate('spouse_id', 'name gender dateOfBirth')
      .populate('children_ids', 'name gender dateOfBirth');

    res.status(200).json({
      success: true,
      data: updatedPerson,
    });
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating person',
    });
  }
};

// Delete a person by ID and clean up relations
exports.deletePerson = async (req, res) => {
  try {
    const personId = req.params.id;
    const person = await Person.findOne({ _id: personId, familyId: req.user.familyId });
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }

    // Remove this person from parents' children_ids
    if (person.parent_ids && person.parent_ids.length > 0) {
      await Person.updateMany(
        { _id: { $in: person.parent_ids }, familyId: req.user.familyId },
        { $pull: { children_ids: personId } }
      );
    }

    // Remove this person from children's parent_ids
    if (person.children_ids && person.children_ids.length > 0) {
      await Person.updateMany(
        { _id: { $in: person.children_ids }, familyId: req.user.familyId },
        { $pull: { parent_ids: personId } }
      );
    }

    // Remove spouse reference (bidirectional)
    if (person.spouse_id) {
      await Person.findOneAndUpdate(
        { _id: person.spouse_id, familyId: req.user.familyId },
        { spouse_id: null }
      );
    }

    // Remove this person
    await Person.deleteOne({ _id: personId, familyId: req.user.familyId });

    res.status(200).json({ success: true, message: 'Person deleted and relations cleaned up' });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ success: false, message: error.message || 'Error deleting person' });
  }
};